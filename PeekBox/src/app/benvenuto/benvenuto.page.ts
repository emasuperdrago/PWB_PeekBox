import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-benvenuto',
  templateUrl: './benvenuto.page.html',
  styleUrls: ['./benvenuto.page.scss'],
  standalone: true,
  imports: [IonicModule, RouterModule, CommonModule],
})
export class BenvenutoPage implements OnInit, OnDestroy {
  slides = [0, 1, 2, 3, 4];
  currentSlide = 0;
  private timer: any;

  ngOnInit() {
    this.startSlideshow();
  }

  ngOnDestroy() {
    this.stopSlideshow();
  }

  startSlideshow() {
    this.timer = setInterval(() => {
      this.nextSlide();
    }, 15000);
  }

  stopSlideshow() {
    if (this.timer) clearInterval(this.timer);
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    this.updateSlides();
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    this.updateSlides();
    this.stopSlideshow();
    this.startSlideshow();
  }

  updateSlides() {
    const slideEls = document.querySelectorAll('.slide');
    slideEls.forEach((el, i) => {
      el.classList.toggle('active', i === this.currentSlide);
    });
  }
}
