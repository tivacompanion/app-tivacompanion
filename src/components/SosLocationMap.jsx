import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin } from 'lucide-react';

export default function SosLocationMap({ lat, lng, timestamp }) {
  if (lat == null || lng == null) return null;
  const position = [lat, lng];
  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-destructive/20 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-destructive" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-navy text-sm">Last Known Location</h3>
          <p className="text-xs text-muted-foreground">
            {timestamp ? `Captured ${new Date(timestamp).toLocaleString()}` : 'Captured at SOS trigger'}
          </p>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden border border-white/10" style={{ height: 200 }}>
        <MapContainer
          center={position}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <Marker position={position}>
            <Popup>
              SOS location
              <br />
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <p className="text-xs text-muted-foreground font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
        <a
          href={`https://maps.google.com/?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-tiva-teal hover:underline ml-auto"
        >
          Open in Google Maps →
        </a>
      </div>
    </div>
  );
}