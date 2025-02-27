import oracledb from "oracledb";

const dbConfig = {
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  connectString:
    process.env.DB_HOST + ":" + process.env.DB_PORT + "/" + process.env.DB_SID,
};

export async function getConnection() {
  try {
    const connection = await oracledb.getConnection(dbConfig);
    console.log("Successfully connected to Oracle Database!");
    return connection;
  } catch (err) {
    console.error("Error connecting to Oracle Database:", err);
    throw err;
  }
}
