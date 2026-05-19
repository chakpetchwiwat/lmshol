import React from 'react';
import { adminAPI } from '../../../utils/api';
import { toUTCISOString } from '../../../utils/dateUtils';
import { ENTITY_STATUS } from '../../../utils/constants/statuses';

const useCoursePublishing = ({
  courseForm,
  isEditing,
  editingId,
  lessons,
  fetchData,
  fetchLessons,
  resetCourseForm,
  setActiveTab,
  setCourseForm,
  setEditingId,
  setIsEditing,
  setShowModal,
  toast
}) => {
  const buildCoursePayload = React.useCallback((status) => ({
    ...courseForm,
    status,
    expiredAt: courseForm.isTemporary ? toUTCISOString(courseForm.expiredAt) : null,
  }), [courseForm]);

  const saveCourseRecord = React.useCallback(async (status) => {
    const shouldPublish = status === ENTITY_STATUS.PUBLISHED;

    if (shouldPublish && (!isEditing || lessons.length === 0)) {
      toast.error('เพิ่มบทเรียนอย่างน้อย 1 บทก่อนเผยแพร่คอร์ส');
      return null;
    }

    const payload = buildCoursePayload(status);
    const response = isEditing
      ? await adminAPI.updateCourse(editingId, payload)
      : await adminAPI.createCourse(payload);

    return {
      payload,
      savedCourse: response.data,
    };
  }, [buildCoursePayload, editingId, isEditing, lessons.length, toast]);

  const finishDraftSave = React.useCallback(async ({ payload, savedCourse }) => {
    const savedCourseId = savedCourse?.id || editingId;

    toast.success(isEditing ? 'บันทึกแบบร่างเรียบร้อย' : 'สร้างฉบับร่างแล้ว เพิ่มบทเรียนต่อได้เลย');
    setIsEditing(true);
    setEditingId(savedCourseId);
    setCourseForm((currentForm) => ({
      ...currentForm,
      ...payload,
      id: savedCourseId,
      status: ENTITY_STATUS.DRAFT,
    }));
    setActiveTab('content');
    if (savedCourseId) {
      await fetchLessons(savedCourseId);
    }
    await fetchData();
  }, [editingId, fetchData, fetchLessons, isEditing, setActiveTab, setCourseForm, setEditingId, setIsEditing, toast]);

  const finishPublishSave = React.useCallback(async () => {
    toast.success('เผยแพร่คอร์สเรียบร้อย');
    setShowModal(false);
    resetCourseForm();
    await fetchData();
  }, [fetchData, resetCourseForm, setShowModal, toast]);

  const saveFromFormSubmit = React.useCallback(async (event) => {
    event.preventDefault();
    const action = event.nativeEvent?.submitter?.value || 'draft';
    const nextStatus = action === 'publish' ? ENTITY_STATUS.PUBLISHED : ENTITY_STATUS.DRAFT;

    try {
      const result = await saveCourseRecord(nextStatus);
      if (!result) return;

      if (nextStatus === ENTITY_STATUS.PUBLISHED) {
        await finishPublishSave();
        return;
      }

      await finishDraftSave(result);
    } catch (error) {
      console.error('Save course error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถบันทึกคอร์สได้');
    }
  }, [finishDraftSave, finishPublishSave, saveCourseRecord, toast]);

  const saveDraftFromBuilder = React.useCallback(async () => {
    try {
      const result = await saveCourseRecord(ENTITY_STATUS.DRAFT);
      if (result) await finishDraftSave(result);
    } catch (error) {
      console.error('Save draft course error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถบันทึกแบบร่างได้');
    }
  }, [finishDraftSave, saveCourseRecord, toast]);

  const publishFromBuilder = React.useCallback(async () => {
    try {
      const result = await saveCourseRecord(ENTITY_STATUS.PUBLISHED);
      if (result) await finishPublishSave();
    } catch (error) {
      console.error('Publish course error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถเผยแพร่คอร์สได้');
    }
  }, [finishPublishSave, saveCourseRecord, toast]);

  return {
    publishFromBuilder,
    saveDraftFromBuilder,
    saveFromFormSubmit
  };
};

export default useCoursePublishing;
