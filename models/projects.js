class Project {
   constructor(db) {
      this.db = db
   }

   static hallo() {
      return 'hallo';
   }

   static projectsModel(search, limit, offset, db) {
      return new Promise((resolve, reject) => {
         const sqlAll = `SELECT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname,',' ORDER BY users.firstname, users.lastname) members FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid ${search} GROUP BY projects.projectid LIMIT ${limit} OFFSET ${offset}`;
         db.query(sqlAll, (err, result) => {
            let data = result.rows;
            if (data.length == 0) {
               resolve(data = []);
            }
            for (let i = 0; i < data.length; i++) {
               if (data[i].members != null) {
                  let memberList = data[i].members.split(',');
                  data[i].members = memberList;
               }
            }
            resolve(data)
            reject(err)
         })
      })
   };

   static pageModel(search, db) {
      return new Promise((resolve, reject) => {
         const sqlPage = `SELECT COUNT(DISTINCT projects.projectid) as total FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid ${search}`
         db.query(sqlPage, (err, result) => {
            let data = result.rows;
            if (data.length == 0) {
               resolve(data = [])
            }
            resolve(data)
            reject(err)
         })
      })
   }

   static addProject = (form, db) => {
      return new Promise((resolve, reject) => {
         let sql = `INSERT INTO projects (name) VALUES ($1)`
         db.query(sql, [form.projectName], (err) => {
            resolve();
            reject(err);
         })
      })
   }

   static addMembers(form, db) {
      let values = [];
      return new Promise((resolve, reject) => {
         db.query(`SELECT MAX (projectid) FROM projects`, (err, data) => {
            let projectId = data.rows[0].max;
            resolve(projectId);
            reject(err);
            let sqlInsert = `INSERT INTO members (projectid, userid) VALUES `
            if (typeof form.members == 'object') {
               form.members.forEach(item => {
                  values.push(`(${projectId}, ${item})`);
               })
               sqlInsert += values.join(', ');
            } else {
               sqlInsert += `(${projectId}, ${form.members})`
            }
            db.query(sqlInsert, (err) => {
               resolve();
               reject(err);
            });
         });
      });
   }

   static deleteProject(id, db) {
      return new Promise((resolve, reject) => {
         let sqlProject = `DELETE FROM projects WHERE projectid = $1`
         db.query(sqlProject, [id], (err) => {
            let sql = `DELETE FROM members WHERE projectid = $1`
            db.query(sql, [id], (err) => {
               resolve();
               reject(err);
            })
         })
      })
   }

   static showMembers(id, db) {
      return new Promise((resolve, reject) => {
         db.query(`SELECT * FROM members WHERE projectid = $1`, [id], (err, data) => {
            let result = data.rows;
            resolve(result);
            reject(err);
         })
      })
   }

   static showProject(projectid, db) {
      return new Promise((resolve, reject) => {
         db.query(`SELECT name, projectid FROM projects WHERE projectid = $1`, [projectid], (err, data) => {
            let result = data.rows[0];
            resolve(result);
            reject(err);
         })
      })
   }

   static updateProjectName(form, db) {
      return new Promise((resolve, reject) => {
         db.query(`UPDATE projects SET name = $1 WHERE projectid = $2`, [form.projectName, form.projectId], (err) => {
            resolve();
            reject(err);
         })
      })
   }

   deleteMember(form, db) {
      return new Promise((resolve, reject) => {
         let sqlDelete = `DELETE FROM members WHERE projectid = $1`;
         db.query(sqlDelete, [parseInt(form.projectId)], (err) => {
            resolve();
            reject(err);
         })
      })
   }



}




module.exports = Project;