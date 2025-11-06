const path = require('path')

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'zh'],
    localeDetection: false,
  },
  localePath: path.resolve(process.cwd(), 'public', 'locales'),
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  strictMode: false,
}




