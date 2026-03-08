const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Create a new meeting
async function createMeeting({
  title,
  time,
  participants,
  agenda,
  actionItems,
  emailDraft,
}) {
  return await prisma.meeting.create({
    data: {
      title,
      time,
      participants,
      agenda,
      actionItems,
      emailDraft,
    },
  });
}

// Get meeting by ID
async function getMeetingById(id) {
  return await prisma.meeting.findUnique({
    where: { id },
  });
}

// Get all meetings
async function getAllMeetings() {
  return await prisma.meeting.findMany();
}

// Update meeting
async function updateMeeting(id, data) {
  return await prisma.meeting.update({
    where: { id },
    data,
  });
}

// Mark action item as completed
async function completeActionItem(meetingId, item) {
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) throw new Error("Meeting not found");
  // Remove item from actionItems
  const updatedItems = meeting.actionItems.filter((i) => i !== item);
  return await prisma.meeting.update({
    where: { id: meetingId },
    data: { actionItems: updatedItems },
  });
}

// Delete meeting
async function deleteMeeting(id) {
  return await prisma.meeting.delete({
    where: { id },
  });
}

module.exports = {
  prisma,
  createMeeting,
  getMeetingById,
  getAllMeetings,
  updateMeeting,
  deleteMeeting,
  completeActionItem,
};
