import React from 'react';

// 1. Base Skeleton Component
const Base = ({ className = '', variant = 'rect', width, height }) => {
  const baseClasses = "animate-pulse bg-slate-200";
  
  const variantClasses = {
    rect: "rounded-lg",
    circle: "rounded-full",
    text: "rounded h-4 w-full"
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// 2. Course Card Skeleton
const CourseCard = () => (
  <div className="flex flex-col overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white shadow-sm h-full">
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/10' }}>
      <Base className="h-full w-full rounded-none" />
      <div className="absolute inset-x-0 top-0 p-4">
        <Base className="h-5 w-20 rounded-full" />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
        <div className="space-y-2">
          <Base className="h-3 w-16" />
          <Base className="h-4 w-32" />
        </div>
        <Base variant="circle" className="h-11 w-11 shrink-0" />
      </div>
    </div>
    <div className="flex flex-col px-5 pb-5 pt-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Base className="h-3 w-20" />
          <div className="h-1 w-1 rounded-full bg-slate-200" />
          <Base className="h-3 w-20" />
        </div>
        <div className="space-y-2">
          <Base className="h-5 w-full" />
          <Base className="h-5 w-4/5" />
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4">
          <div className="space-y-2">
            <Base className="h-4 w-12" />
            <Base className="h-1.5 w-24" />
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Base className="h-6 w-16" />
            <Base className="h-2 w-10" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// 3. Home Page Skeleton
const Home = () => (
  <div className="flex flex-col gap-8 md:gap-12 animate-fade-in pt-0 md:pt-4 pb-16">
    <section className="relative -mx-5 overflow-hidden rounded-none border-b border-slate-200 bg-white md:mx-0 md:rounded-[2.5rem] md:border md:border-slate-200 shadow-sm">
      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_380px] gap-10 items-center p-7 md:p-12 lg:p-16">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          <Base className="h-6 w-40 rounded-full" />
          <div className="space-y-3 w-full flex flex-col items-center lg:items-start">
            <Base className="h-12 w-3/4 md:h-16" />
            <Base className="h-12 w-1/2 md:h-16" />
          </div>
          <div className="space-y-2 w-full flex flex-col items-center lg:items-start">
            <Base className="h-4 w-full max-w-lg" />
            <Base className="h-4 w-2/3 max-w-lg" />
          </div>
          <div className="flex gap-8 pt-6 border-t border-slate-100 w-full justify-center lg:justify-start">
            <div className="space-y-2"><Base className="h-3 w-12" /><Base className="h-8 w-16" /></div>
            <div className="space-y-2"><Base className="h-3 w-12" /><Base className="h-8 w-16" /></div>
            <div className="space-y-2"><Base className="h-3 w-12" /><Base className="h-8 w-24" /></div>
          </div>
        </div>
        <div className="hidden lg:flex justify-center">
          <Base variant="circle" className="h-64 w-64" />
        </div>
      </div>
    </section>

    <section className="space-y-5">
      <div className="space-y-2 px-1 md:px-2">
        <Base className="h-3 w-32" />
        <Base className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Base className="h-48 w-full rounded-[2rem]" />
        <Base className="h-48 w-full rounded-[2rem]" />
      </div>
    </section>

    <section className="space-y-5">
      <div className="flex items-center justify-between px-1 md:px-2">
        <Base className="h-8 w-48" />
        <Base className="h-4 w-24" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <Base key={i} className="h-10 w-28 rounded-full shrink-0" />
        ))}
      </div>
    </section>

    <section className="space-y-8">
      <div className="space-y-4">
        <Base className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <CourseCard key={i} />
          ))}
        </div>
      </div>
    </section>
  </div>
);

// 4. Course Detail Skeleton
const CourseDetail = () => (
  <div className="relative -mx-6 -mt-6 flex min-h-full flex-col bg-slate-50 pb-20 md:mx-0 md:mt-0 md:pb-32 animate-fade-in">
    <div className="h-[400px] w-full bg-slate-900 md:h-[500px]">
      <div className="mx-auto h-full max-w-7xl px-4 flex flex-col justify-center gap-6 sm:px-6 lg:px-8">
        <Base className="h-6 w-32 bg-slate-700" />
        <div className="space-y-4">
          <Base className="h-12 w-3/4 bg-slate-700 md:h-16" />
          <Base className="h-4 w-1/2 bg-slate-700" />
        </div>
        <div className="flex gap-4">
          <Base className="h-10 w-32 bg-slate-700 rounded-full" />
          <Base className="h-10 w-32 bg-slate-700 rounded-full" />
        </div>
      </div>
    </div>

    <div className="relative z-20 mx-auto -mt-8 flex w-full max-w-[1450px] flex-col-reverse gap-6 px-4 sm:px-5 md:-mt-16 md:px-8 lg:flex-row lg:gap-10 xl:px-10 2xl:px-12">
      <div className="flex w-full flex-col gap-6 md:gap-8 lg:min-w-0 lg:flex-1">
        <div className="rounded-[2.5rem] bg-white p-8 shadow-sm">
          <Base className="h-8 w-48 mb-6" />
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Base variant="circle" className="h-5 w-5 shrink-0" />
                <Base className="h-5 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[2.5rem] bg-white p-8 shadow-sm">
          <Base className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex gap-4 items-center w-full">
                  <Base className="h-10 w-10 rounded-xl" />
                  <Base className="h-5 w-1/2" />
                </div>
                <Base className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full lg:w-[380px] xl:w-[420px]">
        <div className="sticky top-24 rounded-[2.5rem] bg-white p-8 shadow-xl border border-slate-100">
          <Base className="aspect-video w-full rounded-2xl mb-6" />
          <div className="space-y-4">
            <Base className="h-14 w-full rounded-2xl" />
            <div className="pt-6 space-y-4">
              <Base className="h-6 w-32" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Base variant="circle" className="h-5 w-5 shrink-0" />
                  <Base className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// 5. List Skeleton (Generic for Rewards, History, etc.)
const List = ({ count = 5 }) => (
  <div className="space-y-4">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm">
        <Base className="h-14 w-14 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Base className="h-4 w-1/3" />
          <Base className="h-3 w-1/4" />
        </div>
        <Base className="h-6 w-20 rounded-full" />
      </div>
    ))}
  </div>
);

// 6. Generic Page Skeleton
const Page = () => (
  <div className="flex flex-col gap-8 animate-fade-in p-2">
    <div className="space-y-4">
      <Base className="h-10 w-64" />
      <Base className="h-4 w-full" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Base key={i} className="h-48 w-full rounded-[2rem]" />
      ))}
    </div>
  </div>
);

// Compound Component Export
const Skeleton = Object.assign(Base, {
  CourseCard,
  Home,
  CourseDetail,
  List,
  Page,
});

export default Skeleton;
