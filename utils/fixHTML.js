const { validHTML5Tags } = require('./constants')

const fixHTML = rawText => {
  let text = rawText
  // let text = rawText.replaceAll('</ ', '</')
  // p^n represents the match, here there are two match arguments

  // remove space between </ random>
  text = text.replace(/(<\/) +([a-z]+>)/gi, '$1$2')

  // set all valid tags without params to lowercase and remove spaces
  const htmlTagRegex = new RegExp(`(<|< *\/) *(${validHTML5Tags.join('|')}) *(>)`, 'gi')
  text = text.replace(htmlTagRegex, (m, p1, p2, p3) => p1.replace(/ +/g, '') + p2.toLowerCase() + p3)

  // match text between < and > (negative lookahead (?!y) and match all not in set [^>])
  text = text.replace(/(<(?!\/))([^>]*)/g, (match, p1, p2, offset, string) => {
    let innerText = p2
    // set to handle </> or other closing tags
    const rClosingTag = new RegExp(/(<\/[a-z0-9]*>)/gi) // check after pattern for '</>'
    const rEndTag = new RegExp(/((?<!<)\/>)/g) // check after pattern '/>
    const isValidHTMLTag = new RegExp( // check is valid tag, expects '<span ' but checks for other situations
      `^( ?(${validHTML5Tags.join('|')})( |([a-z-]+ ?(="|= +"))))`, 'gi')
    const isHTML =
      rClosingTag.test(string.substr(offset)) || rEndTag.test(string.substr(offset)) || isValidHTMLTag.test(p2)
    if (isHTML) {
      innerText = innerText.replace(/^ +/, '') // remove leading spaces
      // replace bad quotes
      innerText = innerText.replace(/[“”«»]/g, '"')
      innerText = innerText.replace(/\ "/g, `\"`) // sometimes a space comes in between \ "
      // remove space between "/ >
      innerText = innerText.replace(/( *\/) +$/g, '$1')
      innerText = innerText.replace(/(")([a-z0-9-]+) (=")/gi, '$1 $2$3') // add space between and remove space "data-test-id ="
      innerText = innerText.replace(/(")([a-z0-9-]+) (=) (")/gi, '$1 $2$3$4') // add space between and remove space "data-test-id ="
      innerText = innerText.replace(/( [a-z0-9-]+) (=")/gi, '$1$2') // remove space between attribute ' name' and `="`
      innerText = innerText.replace(/( [a-z0-9-]+) (=) (")/gi, '$1$2$3') // remove both spaces between =

      // lookahead to make sure followed by quote, it's inner html of <...> so can't check for anything after quote
      innerText = innerText.replace(/(\w=")([^"]*(?="))/gi, function(m, p1, p2) {
        // catch attribute value
        let cleaned = p2 // inside attribute value:
          .replace(/^ +/, '') // remove leading spaces
          .replace(/ +$/, '') // remove ending spaces
          .replace(/ *\/ */g, '/') // remove spaces around `/` for paths
          .replace(/ *: */g, ':') // remove spaces around `:` for paths

        return p1 + cleaned
      })
    }

    return p1 + innerText
  })
  return text
}

module.exports = fixHTML
