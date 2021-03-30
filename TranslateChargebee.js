const fs = require('fs')
const Confirm = require('prompt-confirm')
const { get: _get, set: _set } = require('lodash')
const PromisePool = require('@supercharge/promise-pool')
const csv = require('csv-parser')
const ora = require('ora')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const { handleTextReplacement, asyncForEach, postTranslationProcessing } = require('./utils/helpers')
const {
  chargebeeLanguageSymbols,
  recommendedReplacements,
  recommendedIgnoreValues,
  recommendedWarnIfValuesTranslated,
} = require('./utils/constants')
const consoleProgress = ora(`%0 Reading Files`)

const fileExists = file => fs.existsSync(file)
const translator = fileExists('./translator.js')
  ? require('./translator')
  : async ({ to, from, text }) => {
      // sample translator function
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(`(${to}) ${text}`)
        }, 50)
      })
    }

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

const getLanguageFromDir = dir => {
  const languageStartIndex = LANGUAGE_FOLDER.length + 1
  return dir.substr(languageStartIndex, 2)
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
  } else {
    files = allFiles
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

    if (fileExists(file) && Array.isArray(entriesToUpdate) && entriesToUpdate.length > 0) {
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
  reviewBadTranslations = true,
  translator,
  logs = false,
  concurrentTranslations = 3,
  replacements = recommendedReplacements, // NOTE: replacement happens AFTER looking for existing translation
  ignoreValues = recommendedIgnoreValues, // NOTE: ignore values happens AFTER replacements
  warnIfValuesTranslated = recommendedWarnIfValuesTranslated,
}) => {
  const languages = directories.filter(lang => folders.includes(lang))
  consoleProgress.start()

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

    const updateProgress = () => {
      const currentLength = successfulTranslations.length + failedTranslations.length + unreviewedTranslations.length
      consoleProgress.start(
        `%${Math.round((currentLength / entriesToTranslate.length) * 1.01 * 100)} (${language}) Translating`
      )
    }
    // 1. translate entries with workers
    await PromisePool.for(entriesToTranslate)
      .withConcurrency(concurrentTranslations)
      .process(async entry => {
        try {
          let formattedTranslation
          const language = getLanguageFromDir(entry.source)
          let text = entry['reference value']
          const existingTranslation = getTranslatedContent(language, text)
          text = handleTextReplacement(replacements, text)
          if (ignoreValues.includes(text)) {
            formattedTranslation = { translation: text }
          } else if (useTranslatedValuesIfAvailable && existingTranslation) {
            // if content already translated, use that
            formattedTranslation = { translation: existingTranslation }
          } else {
            translation = await translator({ to: language, from: english, text })
            formattedTranslation = postTranslationProcessing(text, translation, warnIfValuesTranslated)
            if (useTranslatedValuesIfAvailable && !formattedTranslation.shouldReview) {
              addTranslatedContent(language, text, formattedTranslation.translation)
            }
          }
          const translatedEntry = {
            ...entry,
            translation: formattedTranslation.translation,
          }

          if (reviewBadTranslations && formattedTranslation.shouldReview) {
            // we make separate review file for these, typically broken variables or html
            unreviewedTranslations.push({ ...translatedEntry, reason: formattedTranslation.reason })
          } else {
            successfulTranslations.push(translatedEntry)
          }
          updateProgress()
        } catch (e) {
          if (logs) console.error('Translation Error', e)
          failedTranslations.push(entry)
          updateProgress()
        }
      })

    consoleProgress.start(`%99 (${language}) Writing CSVs`)

    // 2. update CSVs
    await updateCSVs(successfulTranslations)

    // 3. push all errored texts to new JSON file for checking
    if (unreviewedTranslations.length > 0) {
      const file = dir + '/UNREVIEWED_TRANSLATIONS.json'
      fs.writeFileSync(file, JSON.stringify(unreviewedTranslations), 'utf-8')
      console.info(`Created unreviewed translations file ${file}`)
    }
    if (failedTranslations.length > 0) {
      const file = dir + '/FAILED_TRANSLATIONS.json'
      fs.writeFileSync(file, JSON.stringify(failedTranslations), 'utf-8')
      console.info(`Created failed translations file ${file}`)
    }
    consoleProgress.stopAndPersist({ text: `100% (${language}) Finished!` })
  })
}

const saveReviewedTranslations = async ({ folders = directories }) => {
  const languages = directories.filter(lang => folders.includes(lang))

  await asyncForEach(languages, async language => {
    const file = LANGUAGE_FOLDER + '/' + language + '/UNREVIEWED_TRANSLATIONS.json'
    const reviewedJSON = fileExists(file) ? require(file) : null

    if (reviewedJSON && Array.isArray(reviewedJSON)) {
      const isValidEntry = entry => {
        let valid = false
        if (typeof entry === 'object' && entry.source && entry['reference value'] && entry.translation) {
          valid = true
        }
        return valid
      }
      const entries = reviewedJSON.filter(isValidEntry)

      if (entries.length > 0) {
        await updateCSVs(entries)
        console.info(`Finished saving ${language} from ${file}`)
      }
    }
  })

  console.info(`Finished saving all applicable files.`)
}

const deleteReviewFiles = async ({ folders = directories }) => {
  const languages = directories.filter(lang => folders.includes(lang))
  const deleteFile = file => fs.unlinkSync(file)

  await asyncForEach(languages, async language => {
    const unreviewedFile = LANGUAGE_FOLDER + '/' + language + '/UNREVIEWED_TRANSLATIONS.json'
    const failedFile = LANGUAGE_FOLDER + '/' + language + '/FAILED_TRANSLATIONS.json'
    if (fileExists(unreviewedFile)) deleteFile(unreviewedFile)
    if (fileExists(failedFile)) deleteFile(failedFile)
  })
}

if (process.env.SAVE_UNREVIEWED_TRANSLATIONS) {
  const prompt = new Confirm(
    'Have you updated the "translated" values in the JSON files (easily confused with "value" values)?'
  )
  prompt.run().then(() => {
    saveReviewedTranslations({})
  })
} else if (process.env.DELETE_REVIEW_FILES) {
  const prompt = new Confirm(
    'Are you sure you want to delete all UNREVIEWED_TRANSLATIONS.json and FAILED_TRANSLATIONS.json files?'
  )
  prompt.run().then(() => {
    deleteReviewFiles({})
  })
} else {
  // typically you don't want to translate these files, or you want to be sure you do. They're all in the mandatory folder.
  const defaultIgnoreFiles = [
    'invoice_customizations.csv',
    'item_addon.csv',
    'item_family.csv',
    'item_plan.csv',
    'item_price_addon.csv',
    'item_price_plan.csv',
    'organization_details.csv',
  ]
  runTranslation({
    translator,
    logs: false,
    concurrentTranslations: 10,
    folders: ['bg'],
    ignoreFiles: defaultIgnoreFiles,
  })
}
