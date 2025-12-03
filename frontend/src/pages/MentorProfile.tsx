import { Award, Briefcase, BookOpen, Save, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MentorProfile {
  username: string;
  email: string;
  bio: string;
  specialization: string;
  certifications: string[];
  experience_years: number;
  avatar_url: string;
}

const MentorProfile = () => {
  const [profile, setProfile] = useState<MentorProfile>({
    username: '',
    email: '',
    bio: '',
    specialization: '',
    certifications: [],
    experience_years: 0,
    avatar_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newCertification, setNewCertification] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/mentors/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/mentors/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });

      const data = await response.json();
      if (data.success) {
        setMessage('Profile updated successfully! ✓');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const addCertification = () => {
    if (newCertification.trim()) {
      setProfile({
        ...profile,
        certifications: [...profile.certifications, newCertification.trim()]
      });
      setNewCertification('');
    }
  };

  const removeCertification = (index: number) => {
    setProfile({
      ...profile,
      certifications: profile.certifications.filter((_, i) => i !== index)
    });
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-purple-800">Mentor Profile</h1>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Specialization
              </label>
              <input
                type="text"
                value={profile.specialization}
                onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., ADHD Coaching, Study Skills, Time Management"
                required
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                rows={4}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Tell students about your experience and approach..."
                required
              />
            </div>

            {/* Experience Years */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Years of Experience
              </label>
              <input
                type="number"
                min="0"
                value={profile.experience_years}
                onChange={(e) => setProfile({ ...profile, experience_years: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            {/* Certifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Certifications
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Add a certification..."
                />
                <button
                  type="button"
                  onClick={addCertification}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.certifications.map((cert, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    <Award className="w-3 h-3" />
                    {cert}
                    <button
                      type="button"
                      onClick={() => removeCertification(index)}
                      className="text-purple-500 hover:text-purple-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MentorProfile;
