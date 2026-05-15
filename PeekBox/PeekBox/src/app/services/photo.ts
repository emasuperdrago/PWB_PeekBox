import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Interfaccia identica a quella del prof (foto IMG_9108)
export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
  base64?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  constructor() { }

  // Funzione come quella del prof (IMG_9110)
  public async addNewToGallery(): Promise<UserPhoto> {
    
    // 1. Scatta la foto
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Base64, // Usiamo Base64 come il prof
      source: CameraSource.Prompt,
      quality: 90
    });

    // 2. Crea l'oggetto foto
    const newPhoto: UserPhoto = {
      filepath: new Date().getTime() + '.jpeg',
      base64: capturedPhoto.base64String,
      // Il prof usa questa stringa per mostrare il base64 nell'HTML
      webviewPath: `data:image/jpeg;base64,${capturedPhoto.base64String}` 
    };

    return newPhoto;
  }
}