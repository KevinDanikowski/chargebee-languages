const { validHTML5Tags } = require('./constants')

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
  return JSON.stringify(arr1) == JSON.stringify(arr2)
}

const startTag = `<(${validHTML5Tags.join('|')})([^>]+)(?=>)`
const endTag = `</(${validHTML5Tags.join('|')})>`
const htmlAndVariablesMatch = (origional, translation) => {
  let match = true
  const matchHtmlTags = new RegExp(`(${startTag}|${endTag})`, 'gi')
  const matchVariables = /((%{[a-z0-9_\\-\\.]+})|({[0-9]}))/gi

  if (!stringArraysEqual(origional.match(matchHtmlTags), translation.match(matchHtmlTags))) {
    match = false
  }
  if (!stringArraysEqual(origional.match(matchVariables), translation.match(matchVariables))) {
    match = false
  }
  return match
}

module.exports = {
  fixChargebeeVariables,
  htmlAndVariablesMatch,
}
