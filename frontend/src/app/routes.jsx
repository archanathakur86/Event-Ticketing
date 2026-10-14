import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import RoleRoute from './RoleRoute'
import HomePage from '../modules/public/pages/HomePage'
import DashboardLayout from '../core/layout/DashboardLayout'
import ProtectedRoute from './ProtectedRoute'
import EventAccessRoute from './EventAccessRoute'

import LoginPage from '../modules/auth/pages/LoginPage'
import RegisterPage from '../modules/auth/pages/RegisterPage'
import ForgotPasswordPage from '../modules/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '../modules/auth/pages/ResetPasswordPage'
import EventDetailsPage from '../modules/public/pages/EventDetailsPage'
import EventsPage from '../modules/public/pages/EventsPage'
import ContactPage from '../modules/public/pages/Contact'
import AboutPage from '../modules/public/pages/About'
import HowItWorksPage from '../modules/public/pages/HowItWorks'
import PaymentSuccessPage from '../modules/payments/pages/PaymentSuccessPage'
import PaymentFailurePage from '../modules/payments/pages/PaymentFailurePage'
import PaymentPendingPage from '../modules/payments/pages/PaymentPendingPage'

import SuperAdminDashboard from '../modules/admin/pages/SuperAdminDashboard'
import CoordinatorDashboard from '../modules/admin/pages/CoordinatorDashboard'
import AdministrationDashboard from '../modules/admin/pages/AdministrationDashboard'
import AdministrationUsersPage from '../modules/admin/pages/AdministrationUsersPage'
import AdministrationReportsPage from '../modules/admin/pages/AdministrationReportsPage'
import CoordinatorEventsPage from '../modules/admin/pages/CoordinatorEventsPage'
import CoordinatorTicketsPage from '../modules/admin/pages/CoordinatorTicketsPage'
import CoordinatorAttendancePage from '../modules/admin/pages/CoordinatorAttendancePage'
import CoordinatorProfile from '../modules/admin/pages/CoordinatorProfile'
import CoordinatorNotifications from '../modules/admin/pages/CoordinatorNotifications'
import ReportsPage from '../modules/admin/pages/ReportsPage'
import EventsListPage from '../modules/events/pages/EventsListPage'
import CreateEventPage from '../modules/events/pages/CreateEventPage'
import EditEventPage from '../modules/events/pages/EditEventPage'
import AdminEventViewPage from '../modules/events/pages/AdminEventViewPage'
import EventAnalyticsPage from '../modules/events/pages/EventAnalyticsPage'
import EventTicketsPage from '../modules/events/pages/EventTicketsPage'
import UsersManagementPage from '../modules/users/pages/UsersManagementPage'
import AttendancePage from '../modules/attendance/pages/AttendancePage'
import NotificationsPage from '../modules/notifications/pages/NotificationsPage'
import LoginLogsPage from '../modules/logs/pages/LoginLogsPage'
import StudentDashboard from '../modules/student/pages/StudentDashboard'
import MyTicketsPage from '../modules/student/pages/MyTicketsPage'
import TicketDetailsPage from '../modules/student/pages/TicketDetailsPage'
import StudentLayout from '../modules/student/layouts/StudentLayout'
import StudentEvents from '../modules/student/pages/StudentEvents'
import StudentTickets from '../modules/student/pages/StudentTickets'
import BrowseEvents from '../modules/student/pages/BrowseEvents'
import StudentPayments from '../modules/student/pages/StudentPayments'
import StudentNotifications from '../modules/student/pages/StudentNotifications'
import StudentSupport from '../modules/student/pages/StudentSupport'
import MyProfile from '../modules/student/pages/MyProfile'
import StudentEventBookingPage from '../modules/student/pages/StudentEventBookingPage'
import AdminProfile from '../modules/admin/pages/AdminProfile'
import TicketsListPage from '../modules/admin/pages/TicketsListPage'
import AdminTicketDetailsPage from '../modules/admin/pages/TicketDetailsPage'
import TicketTemplatePage from '../modules/admin/pages/TicketTemplatePage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/events/:id"
        element={
          <EventAccessRoute>
            <EventDetailsPage />
          </EventAccessRoute>
        }
      />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/payment/success" element={<PaymentSuccessPage />} />
      <Route path="/payment/failure" element={<PaymentFailurePage />} />
      <Route path="/payment/pending" element={<PaymentPendingPage />} />
      
      
      <Route path="/student" element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="events" element={<StudentEvents />} />
        <Route path="events/:id" element={<StudentEventBookingPage />} />
        <Route path="tickets" element={<StudentTickets />} />
        <Route path="tickets/:id" element={<TicketDetailsPage />} />
        <Route path="browse" element={<BrowseEvents />} />
        <Route path="payments" element={<StudentPayments />} />
        <Route path="notifications" element={<StudentNotifications />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="support" element={<StudentSupport />} />
      </Route>

      {/* direct coordinator and administrator portals (role-guarded) */}
      <Route
        path="/coordinator"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["coordinator"]}>
              <DashboardLayout>
                <CoordinatorDashboard />
              </DashboardLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/coordinator/events"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["coordinator"]}>
              <DashboardLayout>
                <CoordinatorEventsPage />
              </DashboardLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/coordinator/events/create"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["coordinator"]}>
              <DashboardLayout>
                <CreateEventPage />
              </DashboardLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/coordinator/events/:id/edit"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["coordinator"]}>
              <DashboardLayout>
                <EditEventPage />
              </DashboardLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/coordinator/tickets"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["coordinator"]}>
              <DashboardLayout>
                <CoordinatorTicketsPage />
              </DashboardLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/coordinator/attendance"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["coordinator"]}>
              <DashboardLayout>
                <CoordinatorAttendancePage />
              </DashboardLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/coordinator/notifications"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["coordinator"]}>
              <DashboardLayout>
                <CoordinatorNotifications />
              </DashboardLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/coordinator/profile"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["coordinator"]}>
              <DashboardLayout>
                <CoordinatorProfile />
              </DashboardLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/administrator"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["admin", "superadmin", "administrator", "administration"]}>
              <DashboardLayout>
                <AdministrationDashboard />
              </DashboardLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/administrator/users"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["admin", "superadmin", "administrator", "administration"]}>
              <DashboardLayout>
                <AdministrationUsersPage />
              </DashboardLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/administrator/reports"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["admin", "superadmin", "administrator", "administration"]}>
              <DashboardLayout>
                <AdministrationReportsPage />
              </DashboardLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/administrator/profile"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["admin", "superadmin", "administrator", "administration"]}>
              <DashboardLayout>
                <AdminProfile />
              </DashboardLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      
      <Route path="/admin">
        <Route
          index
          element={
            <DashboardLayout>
              <SuperAdminDashboard />
            </DashboardLayout>
          }
        />

        <Route
          path="events"
          element={
            <DashboardLayout>
              <EventsListPage />
            </DashboardLayout>
          }
        />

        <Route
          path="events/create"
          element={
            <DashboardLayout>
              <CreateEventPage />
            </DashboardLayout>
          }
        />

        <Route
          path="events/:id/edit"
          element={
            <DashboardLayout>
              <EditEventPage />
            </DashboardLayout>
          }
        />

        <Route
          path="events/:id"
          element={
            <DashboardLayout>
              <AdminEventViewPage />
            </DashboardLayout>
          }
        />

        <Route
          path="events/:id/analytics"
          element={
            <DashboardLayout>
              <EventAnalyticsPage />
            </DashboardLayout>
          }
        />

        <Route
          path="events/:id/tickets"
          element={
            <DashboardLayout>
              <EventTicketsPage />
            </DashboardLayout>
          }
        />

        <Route
          path="users"
          element={
            <DashboardLayout>
              <UsersManagementPage />
            </DashboardLayout>
          }
        />

        <Route
          path="profile"
          element={
            <DashboardLayout>
              <AdminProfile />
            </DashboardLayout>
          }
        />

        <Route
          path="attendance"
          element={
            <DashboardLayout>
              <AttendancePage />
            </DashboardLayout>
          }
        />

        <Route
          path="coordinator"
          element={<Navigate to="/coordinator" replace />}
        />

        <Route
          path="administration"
          element={<Navigate to="/administrator" replace />}
        />

        <Route
          path="reports"
          element={
            <DashboardLayout>
              <ReportsPage />
            </DashboardLayout>
          }
        />

        <Route
          path="notifications"
          element={
            <DashboardLayout>
              <NotificationsPage />
            </DashboardLayout>
          }
        />

        <Route
          path="logs"
          element={
            <DashboardLayout>
              <LoginLogsPage />
            </DashboardLayout>
          }
        />

        <Route
          path="tickets"
          element={
            <DashboardLayout>
              <TicketsListPage />
            </DashboardLayout>
          }
        />

        <Route
          path="tickets/:id"
          element={
            <DashboardLayout>
              <AdminTicketDetailsPage />
            </DashboardLayout>
          }
        />

        <Route
          path="id-templates"
          element={
            <DashboardLayout>
              <TicketTemplatePage />
            </DashboardLayout>
          }
        />
      </Route>
    </Routes>
  )
}
