const fs = require('fs')
const csv = require('csv-parser')

const LANGUAGE_FOLDER = __dirname + '/chargebee-languages'
const symbols = [
  'bg',
  'cs',
  'da',
  'de',
  'es',
  'et',
  'fi',
  'fr',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'lt',
  'lv',
  'nl',
  'no',
  'pl',
  'pt',
  'ro',
  'ru',
  'sk',
  'sl',
  'sv',
  'th',
  'tr',
  'uk',
  'vi',
  'zh',
]
const english = 'en'

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

const getLanguageFromDir = dir => {
  const languageStartIndex = LANGUAGE_FOLDER.length + 1
  return dir.substr(languageStartIndex, 2)
}

// chargebee variables look like %{variable} or {N} such as {0} or {1}
const fixChargebeeVariables = (origional, translation) => {}

const postTranslationProcessing = (origional, translation) => {
  let shouldReview = false
  let formattedTranslation = translation
  // fix html
  // fix chargebee variables
  // trim end and begining white space (only if the origional isn't)
  // check for matching html tags before and after, otherwise flag
  //

  return {
    shouldReview,
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
            // if no 'reference value' then english doesn't have a value, so no point to use it
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

const getDirCSVEntries = async dir => {
  const files = getCSVsInDir(dir)
  let formattedEntries = []

  await asyncForEach(files, async file => {
    const entries = await parseCSV(dir + '/' + file)

    formattedEntries = [...formattedEntries, ...entries]
  })

  return formattedEntries
}

const updateCSVs = async entries => {
  const CSV = {}
  entries.forEach(entry => {
    const thisCSV = CSV[source]
    if (thisCSV) {
      thisCSV.push(entry)
    } else {
      CSV[source] = [entry]
    }
  })
  const CSVsToUpdate = Object.keys(CSV)
  await asyncForEach(CSVsToUpdate, async file => {
    const entriesToUpdate = CSV[file]
    // either get file entries and update the corresponding ones, and rewrite the whole file
    // or
    // update specific rows
  })
}

const directories = getDirectories(LANGUAGE_FOLDER).filter(d => symbols.includes(d))

const runTranslation = async ({
  folders = directories,
  ignoreKeys,
  updateKeys,
  useTranslatedValuesIfAvailable = true,
  ignoreIfValue = true,
  reviewBrokenTranslations = true,
  translator,
}) => {
  const languages = directories.filter(lang => folders.includes(lang))

  await asyncForEach(languages, async language => {
    const dir = LANGUAGE_FOLDER + '/' + language
    const categories = getDirectories(dir)

    let allLanguageEntries = []

    await asyncForEach(categories, async category => {
      const entries = await getDirCSVEntries(dir + '/' + category)

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
        const language = getLanguageFromDir(entry.source)
        const text = entry['reference value']
        const translation = await translator({ to: language, from: english, text })
        const formattedTranslation = postTranslationProcessing(text, translation)
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
  })
}

runTranslation({
  folders: ['bg'],
})
