const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;


let _db;

const mongoConnect = (callback) => {

    MongoClient
    .connect('mongodb+srv://mez:incorrect94@learn-zuf6u.mongodb.net/shop?retryWrites=true&w=majority',{ useNewUrlParser: true })
    .then(client => {
        console.log('Connected!');
        callback();
        _db = client.db();
    })
    .catch(err => {
        console.log(err);
        throw err;
    })
}

const getDB = () => {
    if(_db){
        return _db;
    }else{
        throw 'No Database Found!';
    }
}

//module.exports = mongoConnect;
exports.mongoConnect = mongoConnect;
exports.getDB = getDB;
