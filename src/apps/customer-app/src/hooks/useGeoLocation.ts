import { useState, useEffect } from "react";

export interface GeoLocationState {
    loaded: boolean;
    coordinates?: { lat: number; lng: number };
    error?: { code: number; message: string };
}

const useGeoLocation = () => {
    const [location, setLocation] = useState<GeoLocationState>({
        loaded: false,
        coordinates: { lat: 10.762622, lng: 106.660172 }, // Default HCM
    });

    const onSuccess = (location: GeolocationPosition) => {
        setLocation({
            loaded: true,
            coordinates: {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            },
        });
    };

    const onError = (error: GeolocationPositionError) => {
        setLocation({
            loaded: true,
            error: {
                code: error.code,
                message: error.message,
            },
        });
    };

    useEffect(() => {
        if (!("geolocation" in navigator)) {
            onError({
                code: 0,
                message: "Geolocation not supported",
            } as GeolocationPositionError);
        }

        navigator.geolocation.getCurrentPosition(onSuccess, onError);
    }, []);

    return location;
};

export default useGeoLocation;
