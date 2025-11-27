import { Calendar, Mail, Star, Users, Award, BookOpen } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Header from '../components/dashboard/Header';

interface Specialist {
  id: string;
  username: string;
  email: string;
  bio?: string;
  specialization?: string;
  rating?: number;
  total_students?: number;
  workshops_conducted?: number;
  avatar_url?: string;
}

interface BookingModalProps {
  specialist: Specialist;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ specialist, onClose, onSubmit }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ specialist_id: specialist.id, date, time, notes });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-purple-600 mb-4">
          Book Appointment with {specialist.username}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any specific topics or concerns you'd like to discuss..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">
              Request Appointment
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SpecialistCard: React.FC<{ specialist: Specialist; onBook: () => void; onRegister: () => void }> = ({
  specialist,
  onBook,
  onRegister
}) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Avatar */}
        <div className="w-full md:w-32 flex-shrink-0">
          <div className="w-32 h-32 mx-auto md:mx-0 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-4xl font-bold">
            {specialist.username.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">{specialist.username}</h3>
              <p className="text-purple-600 font-medium">{specialist.specialization || 'ADHD Specialist'}</p>
            </div>
            
            {/* Rating */}
            <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-gray-800">{specialist.rating || '5.0'}</span>
            </div>
          </div>

          <p className="text-gray-600 mb-4">
            {specialist.bio || 'Experienced specialist dedicated to helping students with ADHD achieve their full potential through personalized support and evidence-based strategies.'}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4 text-purple-500" />
              <span><strong>{specialist.total_students || 0}</strong> Students</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span><strong>{specialist.workshops_conducted || 0}</strong> Workshops</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Award className="w-4 h-4 text-green-500" />
              <span><strong>Certified</strong> Professional</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={onBook}
              leftIcon={<Calendar className="w-4 h-4" />}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Book Appointment
            </Button>
            <Button
              onClick={onRegister}
              variant="outline"
              leftIcon={<Users className="w-4 h-4" />}
            >
              Register as Student
            </Button>
            <Button
              variant="ghost"
              leftIcon={<Mail className="w-4 h-4" />}
              onClick={() => window.location.href = `mailto:${specialist.email}`}
            >
              Contact
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

const Specialists: React.FC = () => {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    fetchSpecialists();
  }, []);

  const fetchSpecialists = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/specialists`);
      const data = await response.json();
      
      if (data.success) {
        setSpecialists(data.specialists);
      }
    } catch (error) {
      console.error('Error fetching specialists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = (specialist: Specialist) => {
    setSelectedSpecialist(specialist);
    setShowBooking(true);
  };

  const handleSubmitBooking = async (bookingData: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/specialists/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✅ Appointment request sent! The specialist will review and respond soon.');
        setShowBooking(false);
        setSelectedSpecialist(null);
      } else {
        alert('❌ Failed to book appointment: ' + data.error);
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('❌ Failed to book appointment. Please try again.');
    }
  };

  const handleRegisterAsStudent = async (specialist: Specialist) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/specialists/register-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ specialist_id: specialist.id })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Successfully registered under ${specialist.username}! They can now track your progress.`);
        fetchSpecialists(); // Refresh to update student count
      } else {
        alert('❌ ' + (data.error || 'Failed to register as student'));
      }
    } catch (error) {
      console.error('Error registering as student:', error);
      alert('❌ Failed to register. Please try again.');
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
    <div className="py-8">
      <Header
        title="Find Your Specialist"
        subtitle="Connect with certified ADHD specialists. Book appointments, register as their student, and get personalized support."
      />

      <div className="max-w-6xl mx-auto px-4">
        {specialists.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Specialists Available</h3>
            <p className="text-gray-500">Check back soon for available specialists!</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {specialists.map((specialist) => (
              <SpecialistCard
                key={specialist.id}
                specialist={specialist}
                onBook={() => handleBookAppointment(specialist)}
                onRegister={() => handleRegisterAsStudent(specialist)}
              />
            ))}
          </div>
        )}
      </div>

      {showBooking && selectedSpecialist && (
        <BookingModal
          specialist={selectedSpecialist}
          onClose={() => {
            setShowBooking(false);
            setSelectedSpecialist(null);
          }}
          onSubmit={handleSubmitBooking}
        />
      )}
    </div>
  );
};

export default Specialists;