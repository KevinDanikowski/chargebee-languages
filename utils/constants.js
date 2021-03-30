const validHTML5Tags = [
  'a',
  'abbr',
  'acronym',
  'address',
  'applet',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'basefont',
  'bdi',
  'bdo',
  'bgsound',
  'big',
  'blink',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'center',
  'cite',
  'code',
  'col',
  'colgroup',
  'content',
  'data',
  'datalist',
  'dd',
  'decorator',
  'del',
  'details',
  'dfn',
  'dir',
  'div',
  'dl',
  'dt',
  'element',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'font',
  'footer',
  'form',
  'frame',
  'frameset',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'isindex',
  'kbd',
  'keygen',
  'label',
  'legend',
  'li',
  'link',
  'listing',
  'main',
  'map',
  'mark',
  'marquee',
  'menu',
  'menuitem',
  'meta',
  'meter',
  'nav',
  'nobr',
  'noframes',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'param',
  'plaintext',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'section',
  'select',
  'shadow',
  'small',
  'source',
  'spacer',
  'span',
  'strike',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'tt',
  'u',
  'ul',
  'var',
  'video',
  'wbr',
  'xmp',
]

const chargebeeLanguageSymbols = [
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

const recommendedReplacements = {
  'Incl tax': 'tax inclusive',
  'incl. tax': 'tax inclusive',
  'excl. VAT': 'VAT exclusive',
  // these have to be after or else it will replace the below first and fial to replace the above
  'excl.': 'exclusive',
  'Excl.': 'Exclusive',
  'incl.': 'inclusive',
  'Incl.': 'Inclusive',
  Batchid: 'Batch ID',
  '&rarr;': '->',
  Reg: 'Registration',
  '#': 'Number',
  Qty: 'Quantity',
  'day/s': 'days',
  'password/Password': 'password or password',
  '&copy;': '©',
  V2: 'version 2',
  ' ip ': 'IP',
  ' Ip ': 'IP',
  "''": "'", // not sure why they use double quotes
  csrf: 'CSRF',
  'utf-8': 'UTF-8',
  '%{from_date} to %{to_date}': '%{from_date} - %{to_date}',
  'Discounts/credits': 'Discounts or credits',
  'invoice(s)': 'one or more invoices',
  '</li<li>': '</li><li>',
}

// Some words here are only used in sentences, and not as a single value
const recommendedIgnoreValues = [
  '%{from_date} - %{to_date}',
  '%{tax_name} @ %{rate}',
  '2Checkout',
  '3D',
  'ABN',
  'ACH',
  'API',
  'Alipay',
  'Amazon Payments',
  'Apple Pay',
  'BSB',
  'Bancontact',
  'CVV',
  'Cvv',
  'Diners Club',
  'Dotpay',
  'Dotpay',
  'GSTIN',
  'GoCardless',
  'Google Pay',
  'HST',
  'IBAN',
  'ID',
  'IDEAL',
  'JCB',
  'JSB',
  'MasterCard',
  'OTP',
  'PAD',
  'PII',
  'PO',
  'PST',
  'PayPal',
  'Paypal',
  'QST',
  'Sofort',
  'Stripe',
  'Unionpay',
  'VAT',
  'VIES',
  'Visa',
  'WeChat Pay',
  'XERO',
  'giropay',
  'iDEAL',
  '{0}',
  '.',
  '","',
]

const recommendedWarnIfValuesTranslated = ['3D', '@$!%*#?&()']

module.exports = {
  validHTML5Tags,
  chargebeeLanguageSymbols,
  recommendedReplacements,
  recommendedIgnoreValues,
  recommendedWarnIfValuesTranslated,
}
