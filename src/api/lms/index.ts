import { Api } from "../../core/utils/abstract.js";
import { tables } from "./tables.js";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../core/utils/errors.js";
import LmsQuery from "./query.js";
import AuthMiddleware from "../auth/middleware/auth.js";
import v from "../../core/utils/validate.js";
import { generateCertificate } from "./utils/certificate.js";

class LmsApi extends Api {
  query = new LmsQuery(this.db);
  auth = new AuthMiddleware(this.core);
  handlers = {
    postCourse: (req, res) => {
      const { slug, title, description, lessons, hours } = {
        slug: v.string(req.body.slug),
        title: v.string(req.body.title),
        description: v.string(req.body.description),
        lessons: v.number(req.body.lessons),
        hours: v.number(req.body.hours),
      };

      const writeResult = this.query.insertCourse({
        slug,
        title,
        description,
        lessons,
        hours,
      });

      if (!writeResult || writeResult.changes === 0) {
        throw new ValidationError("Erro ao criar curso.");
      }

      return res.status(201).json({
        title: "Curso criado.",
        id: writeResult.lastInsertRowid,
        changes: writeResult.changes,
      });
    },

    deleteCourse: (req, res) => {
      const courseId = v.number(req.params.id);
      const deleteResult = this.query.deleteCourse(courseId);
      if (!deleteResult || deleteResult.changes === 0) {
        throw new ValidationError("Erro ao deletar curso.");
      }
      return res.status(204).end();
    },

    postLesson: (req, res) => {
      const {
        courseSlug,
        slug,
        title,
        seconds,
        video,
        description,
        order,
        free,
      } = {
        courseSlug: v.string(req.body.courseSlug),
        slug: v.string(req.body.slug),
        title: v.string(req.body.title),
        seconds: v.number(req.body.seconds),
        video: v.string(req.body.video),
        description: v.string(req.body.description),
        order: v.number(req.body.order),
        free: v.number(req.body.free),
      };

      const writeResult = this.query.insertLesson({
        courseSlug,
        slug,
        title,
        seconds,
        video,
        description,
        order,
        free,
      });

      if (!writeResult || writeResult.changes === 0) {
        throw new ValidationError("Erro ao criar aula.");
      }

      return res.status(201).json({
        title: "Aula criada.",
        id: writeResult.lastInsertRowid,
        changes: writeResult.changes,
      });
    },

    deleteLesson: (req, res) => {
      const lessonId = v.number(req.params.id);
      const deleteResult = this.query.deleteLesson(lessonId);
      if (!deleteResult || deleteResult.changes === 0) {
        throw new ValidationError("Erro ao deletar aula.");
      }
      return res.status(204).end();
    },

    getCourses: (req, res) => {
      const courses = this.query.selectCourses();
      if (courses.length === 0) {
        throw new NotFoundError("Nenhum curso encontrado.");
      }
      return res.status(200).json(courses);
    },

    getLessons: (req, res) => {
      const lessons = this.query.selectAllLessons();
      if (lessons.length === 0) {
        throw new NotFoundError("Nenhuma aula encontrada.");
      }
      return res.status(200).json(lessons);
    },

    getCourse: (req, res) => {
      const slug = req.params.slug!;
      const course = this.query.selectCourse(slug);
      if (!course) {
        throw new NotFoundError("Curso não encontrado.");
      }
      const lessons = this.query.selectLessons(slug);

      let completed: {
        lesson_id: number;
        completed: string;
      }[] = [];
      if (req.session) {
        completed = this.query.selectLessonsCompleted(
          req.session.user_id,
          course.id,
        );
      }

      return res.status(200).json({ course, lessons, completed });
    },

    getLesson: (req, res) => {
      const courseSlug = req.params.courseSlug!;
      const lessonSlug = req.params.lessonSlug!;
      const lesson = this.query.selectLesson(courseSlug, lessonSlug);
      const nav = this.query.selectLessonNav(courseSlug, lessonSlug);
      if (!lesson) {
        throw new NotFoundError("Aula não encontrada.");
      }
      const i = nav.findIndex((l) => l.slug === lesson.slug);
      const prev = i === 0 ? null : nav.at(i - 1)?.slug;
      const next = nav.at(i + 1)?.slug ?? null;

      let completed = "";
      if (req.session) {
        const lessonCompleted = this.query.selectLessonCompleted(
          req.session.user_id,
          lesson.id,
        );
        if (lessonCompleted) completed = lessonCompleted.completed;
      }

      return res.status(200).json({ ...lesson, prev, next, completed });
    },

    completeLesson: (req, res) => {
      if (!req.session) {
        throw new UnauthorizedError("Não autorizado");
      }

      const { courseId, lessonId } = {
        courseId: v.number(req.body.courseId),
        lessonId: v.number(req.body.lessonId),
      };

      const writeResult = this.query.insertLessonCompleted(
        req.session.user_id,
        courseId,
        lessonId,
      );

      if (!writeResult || writeResult.changes === 0) {
        throw new ValidationError("Erro ao completar aula.");
      }

      const progress = this.query.selectProgress(req.session.user_id, courseId);
      const incompleteLessons = progress.filter((i) => !i.completed);

      let certificate = null;
      if (progress.length > 0 && incompleteLessons.length === 0) {
        const newCertificate = this.query.insertCertificate(
          req.session.user_id,
          courseId,
        );
        if (!newCertificate) {
          throw new ValidationError("Erro ao gerar certificado.");
        }
        certificate = newCertificate.id;
      }

      return res.status(201).json({ title: "Aula concluída.", certificate });
    },

    resetCourse: (req, res) => {
      if (!req.session) {
        throw new UnauthorizedError("Não autorizado");
      }

      const { courseId } = {
        courseId: v.number(req.body.courseId),
      };

      const writeResultLessons = this.query.deleteLessonsCompleted(
        req.session.user_id,
        courseId,
      );

      if (!writeResultLessons || writeResultLessons.changes === 0) {
        throw new ValidationError("Erro ao resetar curso.");
      }

      const deleteResultCertificate = this.query.deleteCertificate(
        req.session.user_id,
        courseId,
      );

      if (!deleteResultCertificate || deleteResultCertificate.changes === 0) {
        throw new ValidationError("Erro ao deletar certificado.");
      }

      return res.status(200).json({ title: "Curso resetado." });
    },

    getCertificates: (req, res) => {
      if (!req.session) {
        throw new UnauthorizedError("Não autorizado");
      }

      const certificates = this.query.selectCetificates(req.session.user_id);

      return res.status(200).json(certificates);
    },

    getCertificate: (req, res) => {
      const { id } = req.params;
      const certificate = this.query.selectCetificate(id!);
      if (!certificate) {
        throw new NotFoundError("Certificado não encontrado.");
      }
      const pdf = generateCertificate(certificate);
      res.setHeader("Content-Type", "application/pdf");
      return res.status(200).end(pdf);
    },
  } satisfies Api["handlers"];
  tables(): void {
    this.db.exec(tables);
  }
  routes(): void {
    this.router.post(
      "/lms/course",
      this.auth.guard("admin"),
      this.handlers.postCourse,
    );
    this.router.delete(
      "/lms/course/:id",
      this.auth.guard("admin"),
      this.handlers.deleteCourse,
    );
    this.router.get("/lms/courses", this.handlers.getCourses);
    this.router.get(
      "/lms/lessons",
      this.auth.guard("admin"),
      this.handlers.getLessons,
    );
    this.router.get(
      "/lms/course/:slug",
      this.auth.optional,
      this.handlers.getCourse,
    );
    this.router.post(
      "/lms/lesson",
      this.auth.guard("admin"),
      this.handlers.postLesson,
    );
    this.router.delete(
      "/lms/lesson/:id",
      this.auth.guard("admin"),
      this.handlers.deleteLesson,
    );
    this.router.get(
      "/lms/lesson/:courseSlug/:lessonSlug",
      this.auth.optional,
      this.handlers.getLesson,
    );
    this.router.post(
      "/lms/lesson/complete",
      this.auth.guard("user"),
      this.handlers.completeLesson,
    );
    this.router.delete(
      "/lms/course/reset",
      this.auth.guard("user"),
      this.handlers.resetCourse,
    );
    this.router.get(
      "/lms/certificates",
      this.auth.guard("user"),
      this.handlers.getCertificates,
    );
    this.router.get("/lms/certificate/:id", this.handlers.getCertificate);
  }
}

export default LmsApi;
