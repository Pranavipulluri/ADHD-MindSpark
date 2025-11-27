import { BookOpen, Calendar, CheckCircle, Clock, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Appointment {
  id: number;
  student_name: string;
  student_email: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string;
}

interface Student {
  id: number;
  name: string;
  email: string;
  total_tasks: number;
  completed_tasks: number;
  current_streak: number;
  total_points: number;
}

const MentorDashboard = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'appointments' | 'students'>('appointments');

  useEffect(() => {
    fetchAppointments();
    fetchStudents();
  }, []);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/mentor/appointments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/mentor/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleAppointmentAction = async (appointmentId: number, action: 'accept' | 'reject') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/mentor/appointments/${appointmentId}/${action}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        fetchAppointments();
      }
    } catch (error) {
      console.error(`Error ${action}ing appointment:`, error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-purple-800 mb-2">Mentor Dashboard</h1>
          <p className="text-purple-600">Manage your students and appointments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Students</p>
                <p className="text-3xl font-bold text-purple-600">{students.length}</p>
              </div>
              <Users className="w-12 h-12 text-purple-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pending</p>
                <p className="text-3xl font-bold text-orange-600">
                  {appointments.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-12 h-12 text-orange-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Accepted</p>
                <p className="text-3xl font-bold text-green-600">
                  {appointments.filter(a => a.status === 'accepted').length}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">This Week</p>
                <p className="text-3xl font-bold text-blue-600">
                  {appointments.filter(a => a.status === 'accepted').length}
                </p>
              </div>
              <Calendar className="w-12 h-12 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'appointments'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white text-purple-600 hover:bg-purple-50'
            }`}
          >
            <Calendar className="inline-block w-5 h-5 mr-2" />
            Appointments
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'students'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white text-purple-600 hover:bg-purple-50'
            }`}
          >
            <Users className="inline-block w-5 h-5 mr-2" />
            Students Progress
          </button>
        </div>

        {/* Content */}
        {activeTab === 'appointments' ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-purple-800 mb-6">Appointment Requests</h2>
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No appointments yet</p>
              ) : (
                appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="border border-purple-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-purple-800">
                          {appointment.student_name}
                        </h3>
                        <p className="text-sm text-gray-600">{appointment.student_email}</p>
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(appointment.appointment_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {appointment.appointment_time}
                          </span>
                        </div>
                        {appointment.notes && (
                          <p className="mt-2 text-sm text-gray-700 italic">"{appointment.notes}"</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {appointment.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleAppointmentAction(appointment.id, 'accept')}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleAppointmentAction(appointment.id, 'reject')}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        ) : (
                          <span
                            className={`px-4 py-2 rounded-lg font-semibold ${
                              appointment.status === 'accepted'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-purple-800 mb-6">Student Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.length === 0 ? (
                <p className="text-gray-500 text-center py-8 col-span-3">No students assigned yet</p>
              ) : (
                students.map((student) => (
                  <div
                    key={student.id}
                    className="border border-purple-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-lg">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-purple-800">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Tasks Completed</span>
                        <span className="font-semibold text-purple-600">
                          {student.completed_tasks}/{student.total_tasks}
                        </span>
                      </div>
                      <div className="w-full bg-purple-100 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              student.total_tasks > 0
                                ? (student.completed_tasks / student.total_tasks) * 100
                                : 0
                            }%`
                          }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm text-gray-600">Current Streak</span>
                        <span className="font-semibold text-orange-600">
                          🔥 {student.current_streak} days
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Points</span>
                        <span className="font-semibold text-yellow-600">
                          ⭐ {student.total_points}
                        </span>
                      </div>
                    </div>

                    <button className="w-full mt-4 px-4 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorDashboard;
