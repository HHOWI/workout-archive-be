// 운동 무게 통계 API
router.get(
  "/workout-weight-stats",
  authMiddleware,
  workoutController.getExerciseWeightStats
);
