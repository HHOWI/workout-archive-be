import oracledb from "oracledb";

const dbConfig = {
  user: "woa", // 생성한 사용자 이름
  password: "1234", // 사용자 비밀번호
  connectString: "localhost:1521/xe", // 오라클 연결 문자열
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
