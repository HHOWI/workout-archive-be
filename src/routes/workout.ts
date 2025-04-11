// 월별 운동 날짜 목록 조회
router.get(
  "/users/:nickname/workouts/monthly",
  optionalAuth,
  workoutController.getMonthlyWorkoutDates
);
