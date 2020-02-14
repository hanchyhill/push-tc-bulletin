async function main() {
  try {
      var stmt = "CREATE TABLE IF NOT EXISTS Voters (Name TEXT, Count int)";
      console.log(stmt);
      await db.runAsync(stmt);
      var val = await voteAsync("Henry Dam");
      console.log(`New vote for John Doe is ${val}`);
  } 
  catch (e) {
      console.log(JSON.stringify(ex));
  }
}
/* */
async function voteAsync(voter) {
  var val;
  var getStmt = `SELECT Name, Count FROM Voters WHERE Name="${voter}"`;
  console.log(getStmt);
  var row = await db.getAsync(getStmt);
  if (!row) {// 数据为空
      console.log("VOTER NOT FOUND");
      var insertSql = `INSERT INTO Voters (Name, Count) VALUES ("${voter}", 1)`;
      console.log(insertSql);
      await db.runAsync(insertSql);
      val = 1;
      return val;
  }
  else {
      val = row["Count"];
      console.log(`COUNT = ${val}`);
      val += 1;

      // update
      var updateSql = `UPDATE Voters SET Count = ${val} WHERE Name = "${voter}"`;
      console.log(updateSql);
      await db.runAsync(updateSql);
  }

  console.log(`RETURN ${val}`);
  return val;
}