class Project {
    constructor(sql){
        this.sql = sql
    }
    projectsModel = (sql) => {
        return new Promise((resolve, reject) => {
            db.query(sql, (err, result) => {
                let data = result.rows;
                resolve(data)
                reject(err)
            })
        })
    }
}

const sql = `SELECT projects.projectid, projects.name, STRING_AGG (
    users.firstname || ' ' || users.lastname,
    ','
    ORDER BY
        users.firstname,
        users.lastname
) members FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid GROUP BY projects.projectid`;
projectsModel(sql)
    .then(result => {
        res.status(200).json({
            result
        })
    })
});