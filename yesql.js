const fs = require('fs')
const path = require('path')

const readSqlFiles = (dir, options = {}) => {
  return fs.readdirSync(dir).filter(file => {
    return file.endsWith('.sql')
  }).map(file => {
    return {
      name: file,
      content: fs
        .readFileSync(path.resolve(dir, file), 'utf8')
        .replace(/\r\n/g, '\n')
    }
  }).reduce((acc, value) => {
    acc[value.name] = value.content
    value.content.split('\n\n').forEach(sql => {
      if (sql.trim().startsWith('--')) {
        const sqlName = sql.split('\n')[0].trim().substring(2).trim()
        acc[sqlName] = options.type ? module.exports[options.type](sql, options) : sql
      }
    })
    return acc
  }, {})
}

const pg = (query, options = {}) => {
  return (data = {}) => {
    const values = []
    return {
      text: query.replace(/([a-zA-Z0-9.,:]*:)([a-zA-Z0-9_]+)/g, (match, prefix, key) => {
        if (prefix !== ':') {
          return match
        } else if (key in data) {
          values.push(data[key])
          return '$' + values.length
        } else if (options.useNullForMissing) {
          values.push(null)
          return '$' + values.length
        } else {
          return errorMissingValue(key, query, data)
        }
      }),
      values: values
    }
  }
}

const mysql = (query, options = {}) => {
  return (data = {}) => {
    const values = []
    return {
      sql: query.replace(/(::?)([a-zA-Z0-9_]+)/g, (_, prefix, key) => {
        if (key in data) {
          values.push(data[key])
          return prefix.replace(/:/g, '?')
        } else if (options.useNullForMissing) {
          values.push(null)
          return prefix.replace(/:/g, '?')
        } else {
          return errorMissingValue(key, query, data)
        }
      }),
      values: values
    }
  }
}

const errorMissingValue = (key, query, data) => {
  throw new Error('Missing value for statement.\n' + key + ' not provided for statement:\n' + query + '\nthis was provided:\n' + JSON.stringify(data))
}

module.exports = readSqlFiles
module.exports.pg = pg
module.exports.mysql = mysql
