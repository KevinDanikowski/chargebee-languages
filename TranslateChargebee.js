const fs = require('fs')
const { get: _get, set: _set } = require('lodash')
const csv = require('csv-parser')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const fixHTML = require('./utils/fixHTML')
const { fixChargebeeVariables, htmlAndVariablesMatch } = require('./utils/helpers')
const translator = require('./translator')
const { chargebeeLanguageSymbols } = require('./utils/constants')

const CONTENT_DIR = process.env.LANGUAGE_DIRECTORY || 'chargebee-languages'
const LANGUAGE_FOLDER = __dirname + '/' + CONTENT_DIR
const english = 'en'

const PRE_TRANSLATED_CONTENT = {}

const addTranslatedContent = (languageSymbol, text, translation) => {
  if (typeof text !== 'string' || text.length === 0 || !translation || typeof translation !== 'string') return
  const keyPath = `${languageSymbol}.${text}`
  const existingTranslation = _get(PRE_TRANSLATED_CONTENT, keyPath, null)
  if (!existingTranslation) {
    _set(PRE_TRANSLATED_CONTENT, keyPath, translation)
  }
  return
}

const getTranslatedContent = (languageSymbol, text) => {
  if (typeof text !== 'string' || text.length === 0) return null
  const keyPath = `${languageSymbol}.${text}`
  const existingTranslation = _get(PRE_TRANSLATED_CONTENT, keyPath, null)
  return existingTranslation
}

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

const getLanguageFromDir = dir => {
  const languageStartIndex = LANGUAGE_FOLDER.length + 1
  return dir.substr(languageStartIndex, 2)
}

const postTranslationProcessing = (origional, translation) => {
  let formattedTranslation = translation

  // 1. fix chargebee variables
  formattedTranslation = fixChargebeeVariables(formattedTranslation)

  // 2. fix html
  formattedTranslation = fixHTML(formattedTranslation)

  // 3. if white space was lost, add it back
  if (origional.charAt(origional.length) === ' ' && formattedTranslation.charAt(formattedTranslation.length) !== ' ') {
    formattedTranslation = ' ' + formattedTranslation
  }
  if (origional.charAt(0) === ' ' && formattedTranslation.charAt(0) !== ' ') {
    formattedTranslation = formattedTranslation + ' '
  }

  // 4. need to review if html tags or variables don't match
  const checksPass = htmlAndVariablesMatch(origional, formattedTranslation)

  return {
    shouldReview: !checksPass,
    translation: formattedTranslation,
  }
}

const getDirectories = source => {
  return fs
    .readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
}

const getCSVsInDir = (source, extension = 'csv') => {
  const files = fs.readdirSync(source)
  return files.filter(file => file.match(new RegExp(`.*\.(${extension})`, 'ig')))
}

/* Successfully ignores commas inside quotes (") */
const parseCSV = (source, filterAndFormat = true) => {
  let results = []
  return new Promise((resolve, reject) => {
    fs.createReadStream(source)
      .pipe(csv())
      .on('data', data => results.push(data))
      .on('end', () => {
        if (filterAndFormat) {
          const filteredResults = results.filter(data => {
            // if no 'reference value' then english doesn't have a value, so no point to use or translate it
            if (data.key && typeof data.value === 'string' && data['reference value']) {
              return true
            } else {
              return false
            }
          })
          const formattedResults = filteredResults.map(data => ({
            ...data,
            source,
          }))
          results = formattedResults
        }
        resolve(results)
      })
  })
}

const getDirCSVEntries = async ({ dir, updateFiles, ignoreFiles, useTranslatedValuesIfAvailable }) => {
  const allFiles = getCSVsInDir(dir)
  let formattedEntries = []

  let files = []
  if (Array.isArray(updateFiles)) {
    if (Array.isArray(updateFiles) || Array.isArray(ignoreFiles)) {
      files = allFiles.filter(file => {
        let include = true
        if (Array.isArray(ignoreFiles) && ignoreFiles.includes(file)) {
          include = false
        } else if (Array.isArray(updateFiles) && !updateFiles.includes(file)) {
          include = false
        }

        return include
      })
    }
  }

  await asyncForEach(useTranslatedValuesIfAvailable ? allFiles : files, async file => {
    const entries = await parseCSV(dir + '/' + file)

    if (useTranslatedValuesIfAvailable) {
      // build pre-translated map here
      const lang = getLanguageFromDir(dir)
      entries.forEach(entry => {
        addTranslatedContent(lang, entry['reference value'], entry.value)
      })
    }

    // only add entries if they should be included
    if (files.includes(file)) {
      // true every time for !useTranslatedValuesIfAvailable
      formattedEntries = [...formattedEntries, ...entries]
    }
  })

  return formattedEntries
}

const updateCSVs = async entries => {
  const CSV = {}
  entries.forEach(entry => {
    const thisCSV = CSV[entry.source]
    if (thisCSV) {
      thisCSV.push(entry)
    } else {
      CSV[entry.source] = [entry]
    }
  })
  const CSVsToUpdate = Object.keys(CSV)
  await asyncForEach(CSVsToUpdate, async file => {
    const entriesToUpdate = CSV[file]

    if (Array.isArray(entriesToUpdate) && entriesToUpdate.length > 0) {
      // 1. get entries
      const csvContent = await parseCSV(file, false)
      // 2. update entries
      const formattedEntries = csvContent.map(content => {
        const translatedEntry = entriesToUpdate.find(entry => entry.key === content.key)

        return translatedEntry && translatedEntry.translation
          ? { ...content, value: translatedEntry.translation }
          : content
      })

      // 3. write updated file
      const csvWriter = createCsvWriter({
        path: file,
        header: Object.keys(csvContent[0]).map(key => ({ id: key, title: key })),
      })
      await csvWriter.writeRecords(formattedEntries) // returns a promise
    }
  })
}

const directories = getDirectories(LANGUAGE_FOLDER).filter(d => chargebeeLanguageSymbols.includes(d))

const runTranslation = async ({
  folders = directories,
  ignoreKeys,
  updateKeys,
  updateFiles,
  ignoreFiles,
  useTranslatedValuesIfAvailable = true,
  ignoreIfValue = true,
  reviewBrokenTranslations = true,
  translator,
  logs = false,
}) => {
  const languages = directories.filter(lang => folders.includes(lang))

  await asyncForEach(languages, async language => {
    const dir = LANGUAGE_FOLDER + '/' + language
    const categories = getDirectories(dir)

    let allLanguageEntries = []

    await asyncForEach(categories, async category => {
      const entries = await getDirCSVEntries({
        dir: dir + '/' + category,
        updateFiles,
        ignoreFiles,
        useTranslatedValuesIfAvailable,
      })

      allLanguageEntries = [...allLanguageEntries, ...entries]
    })

    const entriesToTranslate = allLanguageEntries.filter(entry => {
      if (ignoreIfValue && entry.value) {
        return false
      } else if (Array.isArray(ignoreKeys) && ignoreKeys.includes(entry.key)) {
        return false
      } else if (Array.isArray(updateKeys) && !updateKeys.includes(entry.key)) {
        return false
      } else {
        return true
      }
    })

    let successfulTranslations = []
    let failedTranslations = []
    let unreviewedTranslations = []

    // 1. translate entries with workers
    await asyncForEach(entriesToTranslate, async entry => {
      try {
        let formattedTranslation
        const language = getLanguageFromDir(entry.source)
        const text = entry['reference value']
        const existingTranslation = getTranslatedContent(language, text)
        if (useTranslatedValuesIfAvailable && existingTranslation) {
          // if content already translated, use that
          formattedTranslation = { translation: existingTranslation, shouldReview: false }
        } else {
          translation = await translator({ to: language, from: english, text })
          formattedTranslation = postTranslationProcessing(text, translation)
          if (useTranslatedValuesIfAvailable && !formattedTranslation.shouldReview) {
            addTranslatedContent(language, text, formattedTranslation.translation)
          }
        }
        const translatedEntry = {
          ...entry,
          translation: formattedTranslation.translation,
        }

        if (reviewBrokenTranslations && formattedTranslation.shouldReview) {
          // will make separate review file for these, typically broken variables or html
          unreviewedTranslations.push(translatedEntry)
        } else {
          successfulTranslations.push(translatedEntry)
        }
      } catch (e) {
        if (logs) console.error('Translation Error', e)
        failedTranslations.push(entry)
      }
    })

    // 2. update CSVs
    await updateCSVs(successfulTranslations)

    // 3. push all errored texts to new JSON file for checking
    if (unreviewedTranslations.length > 0) {
      fs.writeFileSync(
        LANGUAGE_FOLDER + '/UNREVIEWED_TRANSLATIONS.json',
        JSON.stringify(unreviewedTranslations),
        'utf-8'
      )
    }
    if (failedTranslations.length > 0) {
      fs.writeFileSync(LANGUAGE_FOLDER + '/FAILED_TRANSLATIONS.json', JSON.stringify(failedTranslations), 'utf-8')
    }
  })
}

runTranslation({
  translator,
  logs: true,
  folders: ['bg'],
  updateFiles: ['hosted_privacy_settings.csv'],
  updateKeys: ['static.hosted_pages_setting.tos_url_label'],
})
