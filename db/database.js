const cassandra = require('cassandra-driver');

const mapperOptions = require('./mapperOptions').options;

const modelMap = new Map();
let _client, _mapper;

const cassandraConnect = async callback => {
	_client = new cassandra.Client({ contactPoints: ['localhost'], localDataCenter: 'datacenter1', keyspace: 'essentials' });
	try {
		await _client.connect();
		_mapper = new cassandra.mapping.Mapper(_client, mapperOptions);
	} catch (err) {
		console.log(err);
		throw err;
	} finally {
		callback();
	}
};

const getDbModel = modelName => {
	let model = modelMap.get(modelName);
	if (model) {
		return model;
	} else {
		model = _mapper.forModel(modelName);
		modelMap.set(modelName, model);
	}
	return model;
};

const getDbClient = () => {
	if (_client) {
		return _client;
	} else {
		throw 'No database client found!';
	}
};

module.exports = { getDbModel, getDbClient, cassandraConnect };
