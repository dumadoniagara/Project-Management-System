var express = require('express');
var router = express.Router();

module.exports = (db) => {

    router.get('/', function (req, res, next) {

        let membersModel = (sql) => {
            return new Promise((resolve, reject) => {
                db.query(sql, (err, result) => {
                    let data = result.rows;
                    resolve(data)
                    reject(err)
                })
            })
        }

        const sqlMembers = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname FROM users ORDER BY fullname`;

        membersModel(sqlMembers)
            .then(data => {
                res.status(200).json({
                    data
                })
            })
            .catch(err => {
                res.status(500).json({
                    error : true,
                    message : 'testing error'
                })
            })
    })

    return router;
}