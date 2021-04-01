# Chargebee Language Translation Support Package

Chargebee allows a certain number of languages out of the box (https://www.chargebee.com/docs/supported-locales.html), roughly 6. There are, however, around 30 supported by chargebee which you can choose to translate yourself (https://www.chargebee.com/docs/configure-multiple-languages.html). Here is a simple node package to translate those languages easily and efficiently.

# Using Pre-translated values

There is a sample provided for all the languages that are machine translated that are free for you to use. These do not include `mandatory` folders or those CSV files. You will need to run TranslateChargebee.js after adding your `mandatory` folders. There are no guarantees the translations are correct, as they were made by a machine translator.

# Running

# Option 1 Pre-translated values in your project

**First: copy your language pack**, place it in a folder named `project-languages`. _You don't need all the supported languages, it will only copy over the languages you support in the project folder_

**Second: update translated values**, run `npm run update-project-folder` to update all the missing values with their corresponding values from `chargebee-languages` which are already translated

**(optional) Third: translate your left over values**, follow Option 2, but use the `LANGUAGE_FOLDER=project-languages` config in step 3 like `LANGUAGE_FOLDER=project-languages npm run translate`. This will translate the remaining values missing (including your `mandatory` folders)

# Option 2 Translate the values yourself, or update missing values

**First: Config**, edit the config in `TranslateChargebee.js` if the defaults don't work for you. FYI there is around 2250 keys to translate per blank language.

```js
/* Config Options */
const config = {
  folders, // array of language folders you want to include such as ['vi', 'zh']
  ignoreKeys, // array of keys to ignore (runs before inclusion logic)
  updateKeys, // array of keys to include
  ignoreFiles, // default to some CSV files in mandatory directory. array of CSV files to ignore (runs before inclusion logic)
  updateFiles, // array of CSV files to include
  useTranslatedValuesIfAvailable, // Default to true, uses already translated value to avoid running translation fn() again
  ignoreIfValue, // Default to true, if you want to re-translate all values, set this to false
  reviewBadTranslations, // Defaults to true, if we notice an html or variable mishap, we will put in a separate review file
  translator, // translator.js function
  logs, // defaults to false
  concurrentTranslations, // defaults to 3
  replacements, // defaults to recommendedReplacements in /utils/constants, use this to replace text which may not translate well, i.e. { 'excl.': 'exclusive' }
  ignoreValues, // defaults to recommendedIgnoreValues in /utils/constants, use this to ignore text that shouldn't be translated like VAT or {0}
  warnIfValuesTranslated, // defaults to recommendedWarnIfValuesTranslated in /utils/constants, use to check text and translation counts match such as 3D or @$!%*#?&()
}

// example config usage
runTranslation({
  translator,
  logs: true,
  folders: ['bg'],
  updateFiles: ['hosted_privacy_settings.csv'],
  updateKeys: ['static.hosted_pages_setting.tos_url_label'],
})

// use to get recommended constant values if you need them
const {recommendedReplacements, recommendedIgnoreValues, recommendedWarnIfValuesTranslated} = require('./utils/constants)
```

**Second: Translator**, add a `translator.js` file for your translator. There are many simple to use packages. The function should look like so:

```js
module.exports = async ({ to, from, text }) => {
  /*... translate stuff ... */
  return translatedText
}
```

**Third: language export**, if you wish, replace the `chargebee-languages` folder with your languages. If you prefer a different directory, add the env variable `LANGUAGE_DIRECTORY` such as `LANGUAGE_DIRECTORY=my_folder`. _Note: mandatory folders aren't pushed to the repo, you need to add yours manually._

**Fourth: run to Translate**, run it with the command `npm run translate` which runs the `TranslateChargebee.js` file

**Fifth: Review**, check on your translations to review and error translations located in the `chargebee-languages/<relevant_language>` as `UNREVIEWED_TRANSLATIONS.json` and `FAILED_TRANSLATIONS.json`. _In the `UNREVIEWED_TRANSLATIONS.json` change the `translation` value._ This will be used in the next step.

**Sixth: Save reviewed**, after you've reviewed the `UNREVIEWED_TRANSLATIONS.json` and edited all the `translation` values, run `npm run save-reviewed` to save the now reviewed translations.

**Seventh: Delete reviewed and failed**, run `npm run delete-reviews` to delete the `UNREVIEWED_TRANSLATIONS.json` and `FAILED_TRANSLATIONS.json` in all the language directories.

# Contributions

Open an issue and make a corresponding PR. It will get reviewed within a couple days.
