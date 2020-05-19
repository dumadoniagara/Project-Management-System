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


    let profileModel = (user) => {
        return new Promise((resolve, reject) => {
            db.query(`SELECT * FROM members where userid = ${user.userid}`, (err, result) => {
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

    let memberEdit = (user, data) => {
        return new Promise((resolve, reject) => {
            db.query(`UPDATE members
            SET role=$1, type=$2
            WHERE userid = $3;`, [data.role, data.type, user.userid], (err) => {
                resolve()
                reject(err)
            })
        })
    }

    let userEdit = (user, data) => {
        if (data.password) {
            bcrypt.hash(data.password, saltRounds, function (err, hash) {
                if (err) {
                    res.json({
                        error: true,
                        message: "error crypting password"
                    })
                }
                return new Promise((resolve, reject) => {
                    let sql = `UPDATE users
                    SET firstname=$1, lastname=$2, password=$3
                    WHERE userid = $4;`
                    db.query(sql, [data.firstname, data.lastname, hash, user.userid], (err) => {
                        resolve()
                        reject(err)
                    })
                })
            })
        } else {
            return new Promise((resolve, reject) => {
                let sql = `UPDATE users
                SET firstname=$1, lastname=$2
                WHERE userid = $3;`
                db.query(sql, [data.firstname, data.lastname, user.userid], (err) => {
                    resolve()
                    reject(err)
                })
            })
        }
    }


    router.get('/', function (req, res, next) {
        let user = req.session.user;
        profileModel(user)
            .then(data => {
                res.render('profile', {
                    // res.status(200).json({
                    user,
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

    router.post('/', function (req, res, next) {
        let data = req.body;
        let user = req.session.user;
        Promise.all([memberEdit(user, data), userEdit(user,data)])
            .then(() => {
                // req.flash('dataUpdated', 'Data Profile Berhasil di Update');
                res.redirect('/profile')
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
