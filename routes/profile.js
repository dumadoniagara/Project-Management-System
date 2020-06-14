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

    showUserById = (userid) => {
        return new Promise((resolve, reject) => {
          let sql = `SELECT userid, email,firstname, lastname, password, position, type, isadmin FROM users WHERE userid = $1`;
          db.query(sql, [userid], (err, result) => {
            const data = result.rows[0];
            resolve(data);
            reject(err);
          })
        })
      }

      updateUser = (userid, form) => {
        return new Promise((resolve, reject) => {
          let sql = `UPDATE users SET firstname = $1, lastname = $2, email = $3, password = $4, position = $5, type = $6, isadmin = $7 WHERE userid = $8`;
          db.query(sql, [form.firstName, form.lastName, form.email, form.password, form.position, form.type, form.isAdmin, userid], err => {
            resolve();
            reject(err);
          })
        })
      }


    router.get('/', isLoggedIn, function (req, res) {
        const link = 'profile';
        let user = req.session.user;
        showUserById(user.userid)
            .then(data => {
                res.render('profile', {
                    data,
                    link,
                    login : req.session.user    
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.post('/', isLoggedIn, function (req, res, next) {
        let form = req.body;
        let user = req.session.user;
        bcrypt.hash(form.password, saltRounds, function (err, hash) {
            // hash password
            form.password = hash;
            if (err) return res.status(500).json({
              error: true,
              message: err
            })
            updateUser(userid, form)
              .then(() => {
                req.flash('userMessage', 'User updated successfully!');
                res.redirect('/users')
              })
              .catch(err => console.log(err));
          })
    });

    return router;
}
