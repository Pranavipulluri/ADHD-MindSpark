import { Calendar, MapPin, Users, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Workshop {
  id: string;
  title: string;
  description: string;
  scheduled_date: string;
  location: string;
  max_participants: number;
  current_participants: number;
  status: string;
  organizer_name: string;
  is_registered: boolean;
}

const Workshops = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const fetchWorkshops = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ngo/workshops`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setWorkshops(data.workshops || []);
    } catch (error) {
      console.error('Error fetching workshops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (workshopId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ngo/workshops/${workshopId}/register`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchWorkshops();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to register for workshop');
      }
    } catch (error) {
      console.error('Error registering for workshop:', error);
      alert('Failed to register for workshop');
    }
  };

  const handleUnregister = async (workshopId: string) => {
    if (!confirm('Are you sure you want to unregister from this workshop?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ngo/workshops/${workshopId}/register`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchWorkshops();
      }
    } catch (error) {
      console.error('Error unregistering from workshop:', error);
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
          <h1 className="text-4xl font-bold text-purple-800 mb-2">Workshops</h1>
          <p className="text-purple-600">Join workshops organized by NGOs to improve your skills</p>
        </div>

        {/* Workshops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workshops.length === 0 ? (
            <div className="col-span-3 text-center py-12 bg-white rounded-xl shadow-lg">
              <p className="text-gray-500">No upcoming workshops available</p>
            </div>
          ) : (
            workshops.map((workshop) => {
              const isFull = workshop.current_participants >= workshop.max_participants;
              const spotsLeft = workshop.max_participants - workshop.current_participants;

              return (
                <div
                  key={workshop.id}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-purple-800 flex-1">{workshop.title}</h3>
                    {workshop.is_registered && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Registered
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{workshop.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(workshop.scheduled_date).toLocaleDateString()} at{' '}
                      {new Date(workshop.scheduled_date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {workshop.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      {workshop.current_participants}/{workshop.max_participants} participants
                      {!isFull && spotsLeft <= 5 && (
                        <span className="text-orange-600 font-semibold">
                          ({spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left!)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Organized by: {workshop.organizer_name}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-purple-100 rounded-full h-2 mb-4">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isFull ? 'bg-red-500' : 'bg-purple-600'
                      }`}
                      style={{
                        width: `${(workshop.current_participants / workshop.max_participants) * 100}%`
                      }}
                    ></div>
                  </div>

                  {/* Action Button */}
                  {workshop.is_registered ? (
                    <button
                      onClick={() => handleUnregister(workshop.id)}
                      className="w-full px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-semibold"
                    >
                      Unregister
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRegister(workshop.id)}
                      disabled={isFull}
                      className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                        isFull
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {isFull ? 'Workshop Full' : 'Register Now'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Workshops;
