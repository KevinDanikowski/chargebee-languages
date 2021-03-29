const { validHTML5Tags } = require('./constants')
const fixHTML = require('./fixHTML')

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

// chargebee variables look like %{variable} or {N} such as {0} or {1}
const fixChargebeeVariables = rawString => {
  let formattedString = rawString

  // fix the {N} such as {0} or {1} by removing added spaces
  formattedString = formattedString.replace(/({) *([0-9]) *(})/gi, '$1$2$3')

  // fix the % { variable } by removing added spaces
  formattedString = formattedString.replace(/(%) *({) *([a-z0-9_\\-\\.]+) *(})/gi, '$1$2$3$4') // doens't get ٪ which is arabic or other right ot left languages
  // fix the%{variable} by adding a space before it if it accidentally got removed
  formattedString = formattedString.replace(/(?<!\s)(%{[a-z0-9_\\-\\.]+})/gi, ' $1')

  return formattedString
}

const stringArraysEqual = (arr1, arr2) => {
  return JSON.stringify(arr1) === JSON.stringify(arr2)
}

const startTag = `<(${validHTML5Tags.join('|')})([^>]*)(?=>)`
const endTag = `</(${validHTML5Tags.join('|')})>`
const htmlVariablesAndValuesMatch = (origional, translation, warnIfValuesTranslated) => {
  let matches = true
  let reason = ''
  const matchHtmlTags = new RegExp(`(${startTag}|${endTag})`, 'gi')
  const matchVariables = /((%{[a-z0-9_\\-\\.]+})|({[0-9]}))/gi

  if (!stringArraysEqual(origional.match(matchHtmlTags), translation.match(matchHtmlTags))) {
    matches = false
    reason = 'HTML mismatch'
  }
  if (matches && !stringArraysEqual(origional.match(matchVariables), translation.match(matchVariables))) {
    matches = false
    reason = 'Variables mismatch'
  }
  if (Array.isArray(warnIfValuesTranslated)) {
    warnIfValuesTranslated.forEach(val => {
      const re = new RegExp(val, 'g')
      if (matches && !stringArraysEqual(origional.match(re), translation.match(re))) {
        matches = false
        reason = `${val} was translated`
      }
    })
  }

  return { matches, reason }
}

// replacement is recursive
const handleTextReplacement = (replacements, baseText) => {
  if (typeof baseText !== 'string' || !baseText || typeof replacements !== 'object') return baseText
  let replacedStrings = []
  const textStrings = Object.keys(replacements)

  const replace = text => {
    if (replacedStrings.length > 3) return text // protection against endless loops
    const matchingString = textStrings
      .filter(str => !replacedStrings.includes(str))
      .find(str => {
        const re = new RegExp(str, 'g')
        return re.test(text)
      })

    if (matchingString) {
      replacedStrings.push(matchingString) // pushed to strings used array (replacedStrings)
      // NOTE: replaces all instances
      const re = new RegExp(matchingString, 'g')
      return replace(text.replace(re, replacements[matchingString]))
    } else {
      return text
    }
  }
  return replace(baseText)
}

const postTranslationProcessing = (origional, translation, warnIfValuesTranslated) => {
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
  const { matches: checksPass, reason } = htmlVariablesAndValuesMatch(
    origional,
    formattedTranslation,
    warnIfValuesTranslated
  )

  return {
    shouldReview: !checksPass,
    reason,
    translation: formattedTranslation,
  }
}

module.exports = {
  asyncForEach,
  handleTextReplacement,
  postTranslationProcessing,
}
