import { DataSource } from "typeorm";
import { WorkoutPlace } from "../entities/WorkoutPlace";
import * as fs from "fs";
import * as path from "path";
import * as xml2js from "xml2js";

export const seedWorkoutPlaces = async (dataSource: DataSource) => {
  const workoutPlaceRepo = dataSource.getRepository(WorkoutPlace);

  // XML 파일 경로 설정 (프로젝트 루트에 위치한 WorkoutPlaceData.xml)
  const xmlFilePath = path.resolve(__dirname, "../../WorkoutPlaceData.xml");
  const xmlData = fs.readFileSync(xmlFilePath, "utf8");

  // xml2js를 사용하여 XML 파싱 (프로미스 기반)
  const parser = new xml2js.Parser();
  const parsedData = await parser.parseStringPromise(xmlData);

  // XML 구조에 따라 rows 배열 접근
  // 예제 XML에서는 parsedData.result.body[0].rows[0].row 에 모든 <row> 요소가 들어있음
  const rows = parsedData.result.body[0].rows[0].row;

  // 각 row에서 사업장명(bplcNm)과 도로명주소(rdnWhlAddr) 추출하여 DB에 저장
  for (const row of rows) {
    const placeName = row.bplcNm && row.bplcNm[0] ? row.bplcNm[0].trim() : null;
    const placeAddress =
      row.rdnWhlAddr && row.rdnWhlAddr[0] ? row.rdnWhlAddr[0].trim() : null;

    if (!placeName || !placeAddress) {
      console.warn("필수 데이터 누락, 스킵:", row);
      continue;
    }

    // 중복 여부 체크 (사업장명 기준)
    const exist = await workoutPlaceRepo.findOne({
      where: { placeName: placeName },
    });

    if (exist) {
      console.log(`Skipped (already exists): ${placeName}`);
      continue;
    }

    // 새 엔터티 생성 후 저장
    const newWorkoutPlace = workoutPlaceRepo.create({
      placeName: placeName,
      placeAddress: placeAddress,
    });

    await workoutPlaceRepo.save(newWorkoutPlace);
    console.log(`Inserted: ${placeName}`);
  }

  console.log("WorkoutPlace seeding completed.");
};
