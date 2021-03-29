module.exports = async ({ to, from, text }) => {
  // your code here

  const sampleTest = () => `(${to}) ${text}`

  return new Promise((resolve, reject) => {
    setTimeout(function() {
      resolve(sampleTest())
    }, 50)
  })
}
