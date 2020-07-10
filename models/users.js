class Users {
   constructor(db) {
      this.db = db;
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

   

}

module.exports = Users;