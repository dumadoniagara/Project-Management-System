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

  router.get('/', isLoggedIn, function (req, res) {
    const link = 'profile';
    let user = req.session.user;
    showUserById(user.userid)
      .then(data => {
        res.render('profile', {
          data,
          link,
          login: req.session.user,
          messages: req.flash('profileMessage')
        })
      })
      .catch(err => {
        console.log(err);
      })
  })

  router.post('/',isLoggedIn, (req, res) => {
    let user = req.session.user;
    if (!req.body.password) {
      let sql = `UPDATE users
      SET firstname=$1, lastname=$2, position=$3, type=$4
      WHERE userid=$5`
      db.query(sql, [req.body.firstname, req.body.lastname, req.body.position, req.body.type, user.userid], err => {
        if (err) console.log(err);
        req.flash('profileMessage', 'Profile updated');
        res.redirect('/profile')
      })
    } else if (req.body.password) {
      bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        if (err) res.status(500).json(err);
        let sql = `UPDATE users
      SET firstname=$1, lastname=$2, position=$3, type=$4, password=$5
      WHERE userid=$6`
        db.query(sql, [req.body.firstname, req.body.lastname, req.body.position, req.body.type, hash, user.userid], err => {
          if (err) console.log(err);
          req.flash('profileMessage', 'Profile updated');
          res.redirect('/profile')
        })
      })
    }
  })

  return router;
}
