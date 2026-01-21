import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';

export interface AdvertisementData {
  name: string;
  brand: string;
  description: string;
  url: string;
  imageDir: string;
  imageNames: string[];
}

@Component({
  selector: 'app-advertisement-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './advertisement-card.component.html',
  styleUrl: './advertisement-card.component.css'
})
export class AdvertisementCardComponent implements OnInit, OnDestroy {
  @Input() adData: AdvertisementData = {
    name: 'San Remo Platinum Series - Jet Black',
    brand: 'Joshua Legal Art Gallery',
    description: 'Professional Trolley Bag - Jet Black',
    url: 'https://www.joshualegalartgallery.com/products/san-remo-platinum-jet-black',
    imageDir: 'ads/joshua-legal-art-gallery_san-remo',
    imageNames: ['sanremo_ad_1.webp', 'sanremo_ad_2.webp', 'sanremo_ad_3.webp', 'sanremo_ad_4.webp']
  };

  images: string[] = [];
  imageSlides: string[][] = []; // Array of image pairs
  currentSlideIndex = 0;
  collageHeightPx = 240; // Default height in pixels
  imageDimensions: Map<string, { width: number; height: number }> = new Map();
  private slideSubscription?: Subscription;
  private maxHeight = 240; // Maximum height in pixels

  ngOnInit(): void {
    this.loadImages();
    this.groupImagesIntoPairs();
    this.calculateCollageHeight();
    this.startSlideshow();
  }

  ngOnDestroy(): void {
    if (this.slideSubscription) {
      this.slideSubscription.unsubscribe();
    }
  }

  loadImages(): void {
    this.images = this.adData.imageNames.map(name => `${this.adData.imageDir}/${name}`);
  }

  groupImagesIntoPairs(): void {
    this.imageSlides = [];
    for (let i = 0; i < this.images.length; i += 2) {
      const pair = [this.images[i]];
      if (i + 1 < this.images.length) {
        pair.push(this.images[i + 1]);
      }
      this.imageSlides.push(pair);
    }
  }

  calculateCollageHeight(): void {
    // Load first slide images and calculate optimal height
    if (this.imageSlides.length > 0) {
      const firstSlideImages = this.imageSlides[0];
      let loadedCount = 0;

      firstSlideImages.forEach(imageSrc => {
        const img = new Image();
        img.onload = () => {
          this.imageDimensions.set(imageSrc, { 
            width: img.naturalWidth, 
            height: img.naturalHeight 
          });
          loadedCount++;
          
          // Once all images in first slide are loaded, calculate height
          if (loadedCount === firstSlideImages.length) {
            this.updateCollageHeight(firstSlideImages);
          }
        };
        img.src = imageSrc;
      });
    }
  }

  updateCollageHeight(slideImages: string[]): void {
    // For a 2-image collage side by side, calculate the height based on aspect ratios
    // Assuming card width, each image gets half the width
    // The height should accommodate the tallest image relative to its aspect ratio

    let maxCalculatedHeight = this.maxHeight;

    slideImages.forEach(imageSrc => {
      const dims = this.imageDimensions.get(imageSrc);
      if (dims) {
        const aspectRatio = dims.width / dims.height;
        // Each image gets roughly half the card width (minus gap)
        // Assuming card width of ~300px, each image gets ~145px width
        const imageWidth = 145;
        const calculatedHeight = imageWidth / aspectRatio;
        
        if (calculatedHeight < this.maxHeight) {
          maxCalculatedHeight = Math.max(maxCalculatedHeight, calculatedHeight);
        }
      }
    });

    // Store as pixel value for style binding
    this.collageHeightPx = Math.min(maxCalculatedHeight, this.maxHeight);
  }

  startSlideshow(): void {
    if (this.imageSlides.length > 1) {
      this.slideSubscription = interval(4000).subscribe(() => {
        this.currentSlideIndex = (this.currentSlideIndex + 1) % this.imageSlides.length;
      });
    }
  }

  nextSlide(): void {
    this.currentSlideIndex = (this.currentSlideIndex + 1) % this.imageSlides.length;
  }

  previousSlide(): void {
    this.currentSlideIndex = (this.currentSlideIndex - 1 + this.imageSlides.length) % this.imageSlides.length;
  }

  goToSlide(index: number): void {
    this.currentSlideIndex = index;
  }

  openAdLink(): void {
    window.open(this.adData.url, '_blank');
  }
}
