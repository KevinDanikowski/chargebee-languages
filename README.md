# Chargebee Language Translation Support Package

Chargebee allows a certain number of languages out of the box (https://www.chargebee.com/docs/supported-locales.html), roughly 6. There are, however, around 30 supported by chargebee which you can choose to translate yourself (https://www.chargebee.com/docs/configure-multiple-languages.html). Here is a simple node package to translate those languages easily and efficiently.

# Running

**First**, edit the config in `TranslateChargebee.js` if the defaults don't work for you. FYI there is around 2250 keys to translate per blank language.

```js
/* Config Options
folders, // array of language folders you want to include such as ['vi', 'zh']
ignoreKeys, // array of keys to ignore (runs before inclusion logic)
updateKeys, // array of keys to include
updateFiles, // array of CSV files to ignore (runs before inclusion logic)
ignoreFiles, // array of CSV files to include
useTranslatedValuesIfAvailable, // Default to true, uses already translated value to avoid running translation fn() again
ignoreIfValue, // Default to true, if you want to re-translate all values, set this to false
reviewBrokenTranslations, // Defaults to true, if we notice an html or variable mishap, we will put in a separate review file
translator, // translator.js function
logs, // defaults to false
*/
// example config
runTranslation({
  translator,
  logs: true,
  folders: ['bg'],
  updateFiles: ['hosted_privacy_settings.csv'],
  updateKeys: ['static.hosted_pages_setting.tos_url_label'],
})
```

**Second**, add your translator function in the `translator.js`. There are many simple to use packages.

**Third**, if you wish, replace the `chargebee-languages` folder with your languages.

**Fourth**, run it with the command `npm run translate` which runs the `TranslateChargebee.js` file

**Fifth**, check on your translations to review and error translations located in the `chargebee-languages` as `UNREVIEWED_TRANSLATIONS.json` and `FAILED_TRANSLATIONS.json`

# Contributions

Open an issue and make a corresponding PR. It will get reviewed within a couple days.
