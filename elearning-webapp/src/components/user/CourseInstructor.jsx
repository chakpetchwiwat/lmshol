import React from 'react';
import { getFullUrl } from '../../utils/api';

const CourseInstructor = ({ course }) => {
  const instructorName = course.instructorName || 'ทีมวิทยากรผู้เชี่ยวชาญ';

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="mb-5 text-xl font-black tracking-tight text-slate-900 md:text-2xl">ผู้สอน</h2>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-md">
          {course.instructorAvatar ? (
            <img src={getFullUrl(course.instructorAvatar)} alt="ผู้สอน" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-200 text-2xl font-bold uppercase text-slate-400">
              {instructorName?.charAt(0) || 'I'}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-black text-slate-900">{instructorName}</h3>
          <p className="mt-1 text-sm font-bold text-primary">{course.instructorRole || 'วิทยากรประจำหลักสูตร'}</p>
          {course.instructorBio && (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{course.instructorBio}</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default CourseInstructor;
