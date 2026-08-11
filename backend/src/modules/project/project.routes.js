const express = require("express");
const router = express.Router();
const controller = require("./project.controller");
const { protect } = require("../../middleware/auth");
const upload = require("../../middleware/upload");
const arrupload = require("../../middleware/arrayupload");



router.get("/", protect, controller.getProjects);
router.post("/", protect, arrupload.array("attachments"), controller.createProject);
router.put("/:id", protect, arrupload.array("attachments"), controller.updateProject);
router.delete("/:id", protect, controller.deleteProject);
router.get("/clients", protect, controller.getClients);
router.put("/:id/status", protect, controller.updateProjectStatus);
router.get("/:projectId/tasks", protect, controller.getProjectTasks);
router.post("/:projectId/tasks", protect, arrupload.array("attachments"), controller.createTask);
router.post("/tasks/create", protect, arrupload.array("attachments"), controller.createTaskWithoutProject);
router.get("/:projectId/logs", protect, controller.getProjectLogs);
router.get("/:id", protect, controller.getProjectById);
router.get("/tasks/get-tasks", protect, controller.getTasks);
router.get("/tasks/get-assigned-employee", protect, controller.getAssignableEmployees);
router.put("/tasks/:id/status", protect, controller.updateTaskStatus);
router.put("/tasks/update/:id", protect, controller.updateTask);
router.delete("/tasks/delete/:id", protect, controller.deleteTask);
router.get("/tasks/assignable-tasks", protect, controller.getAssignableTasks);

router.get('/get/:taskId/remarks',protect,controller.getTaskRemarks);

// POST   /tasks/:taskId/remarks
//        → multipart/form-data (data JSON + attachments)
//        → matches taskAPI.createRemark(taskId, formData)
router.post(
  '/create/:taskId/remarks',
  protect,
  arrupload.array('attachments', 5),   // allow up to 10 files
  controller.createTaskRemark
);

// PUT    /tasks/:taskId/remarks/:remarkId
//        → supports JSON-only or multipart (for adding new files)
//        → matches taskAPI.updateRemark(taskId, remarkId, data)
router.put(
  '/update/:taskId/remarks/:remarkId',
  protect,
  arrupload.array('attachments', 5),   // optional — new attachments only
  controller.updateTaskRemark
);

// DELETE /tasks/:taskId/remarks/:remarkId
//        → matches taskAPI.deleteRemark(taskId, remarkId)
router.delete('/delete/:taskId/remarks/:remarkId',protect, controller.deleteTaskRemark);









module.exports = router;
