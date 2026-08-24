import { Query } from "../../core/utils/abstract.js";

type CourseData = {
  id: number;
  slug: string;
  title: string;
  description: string;
  lessons: number;
  hours: number;
  created: string;
};

type CourseCreate = Omit<CourseData, "id" | "created">;

type LessonData = {
  id: number;
  course_id: number;
  slug: string;
  title: string;
  seconds: number;
  video: string;
  description: string;
  order: number;
  free: number; // 0 | 1
  created: string;
};

type LessonCreate = Omit<LessonData, "id" | "course_id" | "created"> & {
  courseSlug: string;
};

export type CertificateFullData = {
  id: string;
  name: string;
  title: string;
  hours: number;
  lessons: number;
  completed: string;
};

class LmsQuery extends Query {
  insertCourse({ slug, title, description, lessons, hours }: CourseCreate) {
    return this.db
      .query(
        /* sql */ `
        INSERT INTO "courses"
        ("slug", "title", "description", "lessons", "hours")
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT ("slug") DO UPDATE SET
        "title" = excluded."title",
        "description" = excluded."description",
        "lessons" = excluded."lessons",
        "hours" = excluded."hours"
        ;
      `,
      )
      .run(slug, title, description, lessons, hours);
  }
  deleteCourse(id: number) {
    return this.db
      .query(
        /* sql */ `
        DELETE FROM "courses"
        WHERE "id" = ?;
        `,
      )
      .run(id);
  }
  insertLesson({
    courseSlug,
    slug,
    title,
    seconds,
    video,
    description,
    order,
    free,
  }: LessonCreate) {
    return this.db
      .query(
        /* sql */ `
        INSERT INTO "lessons"
          ("course_id", "slug", "title", "seconds", "video", "description", "order", "free")
        VALUES
          ((SELECT "id" FROM "courses" WHERE "slug" = ? LIMIT 1), ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT ("course_id", "slug") DO UPDATE SET
        "title" = excluded."title",
        "description" = excluded."description",
        "seconds" = excluded."seconds",
        "video" = excluded."video",
        "order" = excluded."order",
        "free" = excluded."free"
        ;
        `,
      )
      .run(courseSlug, slug, title, seconds, video, description, order, free);
  }
  deleteLesson(id: number) {
    return this.db
      .query(
        /* sql */ `
        DELETE FROM "lessons"
        WHERE "id" = ?;
        `,
      )
      .run(id);
  }
  selectCourses() {
    return this.db
      .query(
        /* sql */ `
        SELECT * FROM "courses"
        ORDER BY "created" ASC LIMIT 100;
      `,
      )
      .all() as CourseData[];
  }
  selectCourse(slug: string) {
    return this.db
      .query(
        /* sql */ `
        SELECT * FROM "courses" 
        WHERE "slug" = ? LIMIT 1;
      `,
      )
      .get(slug) as CourseData | undefined;
  }
  selectAllLessons() {
    return this.db
      .query(
        /* sql */ `
        SELECT "l".*, "c"."title" AS "course", "c"."slug" AS "courseSlug" 
        FROM "lessons" AS "l"
        INNER JOIN "courses" AS "c"
        ON "c"."id" = "l"."course_id"
        ORDER BY "l"."course_id" ASC, "l"."order" ASC;
        `,
      )
      .all() as LessonData[];
  }
  selectLessons(courseSlug: string) {
    return this.db
      .query(
        /* sql */ `
        SELECT * FROM "lessons" 
        WHERE "course_id" = (SELECT "id" FROM "courses" WHERE "slug" = ? LIMIT 1)
        ORDER BY "order" ASC;
      `,
      )
      .all(courseSlug) as LessonData[];
  }
  selectLesson(courseSlug: string, lessonSlug: string) {
    return this.db
      .query(
        /* sql */ `
        SELECT * FROM "lessons" 
        WHERE "course_id" = (SELECT "id" FROM "courses" WHERE "slug" = ? LIMIT 1)
        AND "slug" = ? LIMIT 1;
      `,
      )
      .get(courseSlug, lessonSlug) as LessonData | undefined;
  }
  selectLessonNav(courseSlug: string, lessonSlug: string) {
    return this.db
      .query(
        /* sql */ `
        SELECT "slug" FROM "lesson_nav" 
        WHERE "course_id" = (SELECT "id" FROM "courses" WHERE "slug" = ? LIMIT 1)
        AND "current_slug" = ?;
      `,
      )
      .all(courseSlug, lessonSlug) as { slug: string }[];
  }
  insertLessonCompleted(userId: number, courseId: number, lessonId: number) {
    return this.db
      .query(
        /* sql */ `
        INSERT OR IGNORE INTO "lessons_completed"
          ("user_id", "course_id", "lesson_id")
        VALUES
          (?, ?, ?)
        ;
      `,
      )
      .run(userId, courseId, lessonId);
  }
  selectLessonCompleted(userId: number, lessonId: number) {
    return this.db
      .query(
        /* sql */ `
        SELECT "completed" FROM "lessons_completed"
        WHERE "user_id" = ? AND "lesson_id" = ?
        ;
      `,
      )
      .get(userId, lessonId) as { completed: string } | undefined;
  }
  selectLessonsCompleted(userId: number, courseId: number) {
    return this.db
      .query(
        /* sql */ `
        SELECT "lesson_id", "completed" FROM "lessons_completed"
        WHERE "user_id" = ? AND "course_id" = ?
        ;
      `,
      )
      .all(userId, courseId) as { lesson_id: number; completed: string }[];
  }
  deleteLessonsCompleted(userId: number, courseId: number) {
    return this.db
      .query(
        /* sql */ `
        DELETE FROM "lessons_completed"
        WHERE "user_id" = ? AND "course_id" = ?
        ;
      `,
      )
      .run(userId, courseId);
  }
  deleteCertificate(userId: number, courseId: number) {
    return this.db
      .query(
        /* sql */ `
        DELETE FROM "certificates"
        WHERE "user_id" = ? AND "course_id" = ?
        ;
      `,
      )
      .run(userId, courseId);
  }
  selectProgress(userId: number, courseId: number) {
    return this.db
      .query(
        /* sql */ `
        SELECT "l"."id", "lc"."completed"
        FROM "lessons" as "l"
        LEFT JOIN "lessons_completed" as "lc"
        ON "l"."id" = "lc"."lesson_id" AND "lc"."user_id" = ?
        WHERE "l"."course_id" = ?
        ;
      `,
      )
      .all(userId, courseId) as { id: number; completed: string }[];
  }
  insertCertificate(userId: number, courseId: number) {
    return this.db
      .query(
        /* sql */ `
        INSERT OR IGNORE INTO "certificates"
          ("user_id", "course_id")
        VALUES
          (?, ?)
        RETURNING "id"
        ;
      `,
      )
      .get(userId, courseId) as { id: string } | undefined;
  }
  selectCetificates(userId: number) {
    return this.db
      .query(
        /* sql */ `
        SELECT * FROM "certificates_full"
        WHERE "user_id" = ?
        ;
      `,
      )
      .all(userId) as CertificateFullData[];
  }
  selectCetificate(certificateId: string) {
    return this.db
      .query(
        /* sql */ `
        SELECT * FROM "certificates_full"
        WHERE "id" = ?
        ;
      `,
      )
      .get(certificateId) as CertificateFullData | undefined;
  }
}

export default LmsQuery;
