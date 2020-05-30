var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

function isLoggedIn(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
}

module.exports = (db) => {

    let profileModel = (id) => {
        return new Promise((resolve, reject) => {
            db.query(`SELECT * FROM users where userid = ${id}`, (err, result) => {
                let data = result.rows;
                if (data.length == 0) {
                    return res.send('error user data')
                    // bisa ditamabahin flash (data tidak ditemukan)
                }
                resolve(data)
                reject(err)
            })
        })
    }

    let userEdit = (user, data) => {
        if (data.password) {
            bcrypt.hash(data.password, saltRounds, (err, hash) => {
                if (err) {
                    res.json({
                        error: true,
                        message: "error crypting password"
                    })
                }
                return new Promise((resolve, reject) => {
                    let sql = `UPDATE users SET firstname=$1, lastname=$2, position=$3, type=$4, password=$5 WHERE userid = $6`;
                    db.query(sql, [data.firstname, data.lastname, data.position, data.type, hash, user.userid], (err) => {
                        resolve();
                        reject(err);
                    });
                });
            })
        } else {
            return new Promise((resolve, reject) => {
                let sql = `UPDATE users
                SET firstname=$1, lastname=$2, position=$3, type=$4
                WHERE userid = $5`
                db.query(sql, [data.firstname, data.lastname, data.position, data.type, user.userid], (err) => {
                    resolve();
                    reject(err);
                })
            })
        }
    }


    router.get('/', isLoggedIn, function (req, res, next) {
        let user = req.session.user;
        profileModel(user.userid)
            .then(data => {
                res.render('profile', {
                    // res.status(200).json({
                    data: data[0]
                })
            })
            .catch(err => {
                res.json({
                    error: true,
                    message: 'error profileModel'
                })
            })
    })

    router.post('/', isLoggedIn, function (req, res, next) {
        let data = req.body;
        let user = req.session.user;
        userEdit(user, data)
            .then(() => {
                // req.flash('dataUpdated', 'Data Profile Berhasil di Update');
                // res.redirect('/profile')
                res.status(200).json({
                    user,
                    data
                })
            })
            .catch((err) => {
                res.status(500).json({
                    error: true,
                    message: 'error pada pengubahan data'
                })
            })
    });

    return router;
}
