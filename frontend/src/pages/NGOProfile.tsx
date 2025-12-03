import { Building2, Globe, Mail, MapPin, Phone, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

const NGOProfile = () => {
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    bio: '',
    organization_name: '',
    organization_type: '',
    contact_phone: '',
    website_url: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ngo/profile`, {
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ngo/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });

      const data = await response.json();
      if (data.success) {
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    } finally {
      setSaving(false);
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Building2 className="w-10 h-10 text-purple-600" />
          <div>
            <h1 className="text-4xl font-bold text-purple-800">NGO Profile</h1>
            <p className="text-purple-600">Update your organization information</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          {/* Organization Info */}
          <div>
            <h2 className="text-2xl font-bold text-purple-800 mb-4">Organization Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={profile.organization_name}
                  onChange={(e) => setProfile({ ...profile, organization_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., ADHD Support Foundation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Type
                </label>
                <select
                  value={profile.organization_type}
                  onChange={(e) => setProfile({ ...profile, organization_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select type</option>
                  <option value="nonprofit">Non-Profit</option>
                  <option value="charity">Charity</option>
                  <option value="foundation">Foundation</option>
                  <option value="community">Community Organization</option>
                  <option value="educational">Educational Institution</option>
                </select>
              </div>
            </div>
          </div>

          {/* About */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              About Your Organization *
            </label>
            <textarea
              rows={5}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Describe your organization's mission, services, and how you support students with ADHD..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="text-2xl font-bold text-purple-800 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={profile.contact_phone}
                  onChange={(e) => setProfile({ ...profile, contact_phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="w-4 h-4 inline mr-2" />
                  Website URL
                </label>
                <input
                  type="url"
                  value={profile.website_url}
                  onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
                  placeholder="https://www.yourorganization.org"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Address
                </label>
                <textarea
                  rows={3}
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="123 Main St, City, State, ZIP"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2 shadow-lg"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NGOProfile;
