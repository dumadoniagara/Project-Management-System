var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

let checkOption = {
  id: true,
  name: true,
  position: true,
  email: true,
  type: true
}

// ============================
// localhost:3000/users/
// ===========================


module.exports = (db) => {

  showUsers = (offset, search) => {
    return new Promise((resolve, reject) => {
      let sql = `SELECT userid, email, CONCAT(firstname, ' ', lastname) AS fullname, position, type FROM users ${search} ORDER BY userid ASC LIMIT 3 OFFSET ${offset} `;
      db.query(sql, [], (err, result) => {
        const data = result.rows;
        resolve(data);
        reject(err);
      })
    })
  }

  countPages = (search) => {
    return new Promise((resolve, reject) => {
      let sql = `SELECT COUNT(userid) AS total FROM users ${search}`;
      db.query(sql, [], (err, result) => {
        const total = result.rows[0].total;
        resolve(total);
        reject(err);
      })
    })
  }

  router.get('/', (req, res, next) => {
    const url = req.url == '/' ? `/?page=1` : req.url;
    const page = req.query.page || 1;
    const limit = 3;
    const offset = (page - 1) * limit;
    let isSearch = false;
    let search = "";
    let query = [];
    const { checkId, id, checkName, name, checkEmail, email, checkType, type, checkPosition, position } = req.query;

    if(checkName && name){
      isSearch = true;
      query.push(`CONCAT(firstname,' ',lastname) ILIKE '%${name}%'`);
    }
    if(checkId && id){
      isSearch = true;
      query.push(`userid = ${parseInt(id)}`);
    }
    if(checkEmail && email){
      isSearch = true;
      query.push(`email = '${email}'`);
    }
    if(checkPosition && position){
      isSearch = true;
      query.push(`position = '${position}'`);
    }
    if(checkType && type){
      isSearch = true;
      query.push(`type = '${type}'`);
    }

    if(isSearch){
      search += `WHERE ${query.join(' AND ')}`;
    }

    console.log(search);
    Promise.all([showUsers(offset, search), countPages(search)])
      .then(data => {
        let [users, total] = data;
        let pages = Math.ceil(total / limit);
        res.render('users/index', {
          // res.json({
          checkOption,
          users,
          page,
          pages,
          url
        })
      })
      .catch(err => console.log(err));
  })

  router.post('/', (req, res) => {
    const { checkId, checkName, checkPosition, checkType, checkEmail } = req.body;
    checkOption.id = checkId;
    checkOption.name = checkName;
    checkOption.position = checkPosition;
    checkOption.type = checkType;
    checkOption.email = checkEmail;
    res.redirect('/users');
  })



  router.post('/add', function (req, res, next) {
    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
      // Store hash in your password DB.
      if (err) return res.status(500).json({
        error: true,
        message: err
      })

      const sql = 'INSERT INTO users (email, password, firstname, lastname) VALUES($1, $2, $3, $4)';
      const values = [req.body.email, hash, req.body.firstname, req.body.lastname];

      db.query(sql, values, (err) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        res.json({
          error: false,
          message: "data berhasil ditambahkan"
        })
      })
    });
  });

  return router;
}
