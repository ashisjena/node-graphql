const { mapping } = require('cassandra-driver');
const modalNames = require('./dbModalNames');

const options = {
	models: {}
};

options.models[modalNames.POST] = {
	tables: ['post'],
	mappings: new mapping.UnderscoreCqlToCamelCaseMappings(),
	keyspace: 'essentials'
};

options.models[modalNames.USER] = {
	tables: ['user'],
	mappings: new mapping.UnderscoreCqlToCamelCaseMappings(),
	keyspace: 'essentials'
};

module.exports = { options };
