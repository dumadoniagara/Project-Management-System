class Users {
   constructor() {
   }

   static usersModel(db) {
      return new Promise((resolve, reject) => {
         const sqlMembers = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname FROM users ORDER BY fullname`;
         db.query(sqlMembers, (err, result) => {
            let data = result.rows;
            resolve(data)
            reject(err)
         })
      })
   }

   static showUsers(offset, search, db) {
      return new Promise((resolve, reject) => {
         let sql = `SELECT userid, email, CONCAT(firstname, ' ', lastname) AS fullname, position, type, isadmin FROM users ${search} ORDER BY userid ASC LIMIT 3 OFFSET ${offset} `;
         db.query(sql, [], (err, result) => {
            const data = result.rows;
            resolve(data);
            reject(err);
         })
      })
   }

   static countPages(search, db) {
      return new Promise((resolve, reject) => {
         let sql = `SELECT COUNT(userid) AS total FROM users ${search}`;
         db.query(sql, [], (err, result) => {
            const total = result.rows[0].total;
            resolve(total);
            reject(err);
         })
      })
   }

   static addUser(form, db) {
      return new Promise((resolve, reject) => {
         let sql = `INSERT INTO users (email, password, firstname, lastname, position, type, isadmin)
     VALUES($1, $2, $3, $4, $5, $6, $7)`;
         db.query(sql, [form.email, form.password, form.firstName, form.lastName, form.position, form.type, form.isAdmin], (err, result) => {
            resolve();
            reject(err);
         })
      })
   }

   static showUserById(userid, db) {
      return new Promise((resolve, reject) => {
         let sql = `SELECT userid, email,firstname, lastname, password, position, type, isadmin FROM users WHERE userid = $1`;
         db.query(sql, [userid], (err, result) => {
            const data = result.rows[0];
            resolve(data);
            reject(err);
         })
      })
   }

   static deleteUser(userid, db) {
      return new Promise((resolve, reject) => {
         let sqlMember = `DELETE FROM members WHERE userid = $1`;
         let sqlUser = `DELETE FROM users WHERE userid = $1`;
         let sqlIssue = `DELETE FROM issues WHERE assignee = $1`;
         db.query(sqlIssue, [userid], err => {
            if (err) res.status(500).json(err);
            db.query(sqlMember, [userid], err => {
               if (err) res.status(500).json(err);
               db.query(sqlUser, [userid], err => {
                  resolve();
                  reject(err);
               })
            })
         })
      })
   }
}

module.exports = Users;