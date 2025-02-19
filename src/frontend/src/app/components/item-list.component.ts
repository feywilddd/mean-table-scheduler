import { Component, OnInit } from '@angular/core';
import { ItemService } from '../services/item.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-item-list',
  standalone: true,  
  imports: [CommonModule],
  template: `
    <div>
      <h2>Items</h2>
      <ul>
        <li *ngFor="let item of items">
          {{ item.name }} - {{ item.description }}
        </li>
      </ul>
    </div>
  `
})
export class ItemListComponent implements OnInit {
  items: any[] = [];

  constructor(private itemService: ItemService) { }

  ngOnInit() {
    this.itemService.getItems().subscribe(
      data => {
        console.log("Données reçues du backend :", data);  
        this.items = data;
      },
      error => console.error("Erreur lors de la récupération des items :", error)
    );
  }  
}