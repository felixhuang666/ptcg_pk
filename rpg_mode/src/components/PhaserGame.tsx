import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';

interface PhaserGameProps {
  key?: string | number;
  mode: 'play' | 'edit';
  onMapSaved?: () => void;
}

export default function PhaserGame({ mode, onMapSaved }: PhaserGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    // Initialize Socket.io
    const socketUrl = window.location.origin;
    const socket = io(socketUrl);
    socketRef.current = socket;

    let isDestroyed = false;

    class MainScene extends Phaser.Scene {
      private mapData: any = null;
      private player: Phaser.Physics.Arcade.Sprite | null = null;
      private otherPlayers: Record<string, Phaser.Physics.Arcade.Sprite> = {};
      private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
      private currentTileType: number = 1; // 0 = grass, 1 = water, 2 = mountain
      private isEditor: boolean = false;
      private saveButton: Phaser.GameObjects.Text | null = null;
      private tileSelector: Phaser.GameObjects.Text | null = null;
      private lastAnim: string | null = null;
      private joystickBase: Phaser.GameObjects.Arc | null = null;
      private joystickThumb: Phaser.GameObjects.Arc | null = null;
      private joystickActive: boolean = false;
      private joystickVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
      private isAttacking: boolean = false;
      private actionMode: 'walk' | 'attack' = 'walk';
      private currentDirection: string = 'down';
      private attackButton: Phaser.GameObjects.Text | null = null;
      private modeButton: Phaser.GameObjects.Text | null = null;
      private attackButtonDown: boolean = false;
      private undoStack: number[][] = [];
      private redoStack: number[][] = [];
      private isPanning: boolean = false;
      private panStart: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
      private camStart: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
      private tilemap: Phaser.Tilemaps.Tilemap | null = null;
      private tileset: Phaser.Tilemaps.Tileset | null = null;
      private layer: Phaser.Tilemaps.TilemapLayer | null = null;
      private infoText: Phaser.GameObjects.Text | null = null;

      constructor() {
        super('MainScene');
      }

      init(data: any) {
        this.isEditor = data.mode === 'edit';
      }

      preload() {
        // We will just use colored rectangles for tiles to keep it simple
        // Load the character image from the public folder
        // Add a timestamp to prevent browser caching issues when replacing the image
        this.load.image('player_img', `/character.png?t=${Date.now()}`);
        this.load.image('player_atk_img', `/character_atk.png?t=${Date.now()}`);
      }

      async create() {
        // Generate a simple tileset texture programmatically
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        
        // Grass (Tile index 1)
        graphics.fillStyle(0x228b22);
        graphics.fillRect(0, 0, 32, 32);
        graphics.lineStyle(1, 0x000000, 0.2);
        graphics.strokeRect(0, 0, 32, 32);
        
        // Water (Tile index 2)
        graphics.fillStyle(0x1e90ff);
        graphics.fillRect(32, 0, 32, 32);
        graphics.strokeRect(32, 0, 32, 32);
        
        // Mountain (Tile index 3)
        graphics.fillStyle(0x808080);
        graphics.fillRect(64, 0, 32, 32);
        graphics.strokeRect(64, 0, 32, 32);
        
        graphics.generateTexture('tileset', 96, 32);

        // Dynamically create spritesheet from loaded image to handle any resolution
        const processImage = (imgKey: string, spriteKey: string) => {
          if (this.textures.exists(imgKey)) {
            const img = this.textures.get(imgKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
            if (img && img.width > 0) {
              // Create a canvas to process the image and remove background
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d')!;
              ctx.drawImage(img, 0, 0);
              
              try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Use top-left pixel as the background color key
                const bgR = data[0];
                const bgG = data[1];
                const bgB = data[2];
                const bgA = data[3];
                
                const tolerance = 30; // Tolerance for JPEG/compression artifacts
                
                // Only process if the background isn't already fully transparent
                if (bgA > 10) {
                  for (let i = 0; i < data.length; i += 4) {
                    // If pixel matches background color within tolerance, make it transparent
                    if (Math.abs(data[i] - bgR) <= tolerance && 
                        Math.abs(data[i+1] - bgG) <= tolerance && 
                        Math.abs(data[i+2] - bgB) <= tolerance) {
                      data[i+3] = 0;
                    }
                  }
                  ctx.putImageData(imageData, 0, 0);
                }
              } catch (e) {
                console.warn('Could not process image transparency', e);
              }

              const frameWidth = img.width / 3;
              const frameHeight = img.height / 4;
              
              if (this.textures.exists(spriteKey)) {
                this.textures.remove(spriteKey);
              }
              
              this.textures.addSpriteSheet(spriteKey, canvas, {
                frameWidth: frameWidth,
                frameHeight: frameHeight
              });
            }
          }
        };

        processImage('player_img', 'player');
        processImage('player_atk_img', 'player_atk');

        // Create animations (Row 1: Down, Row 2: Left, Row 3: Up, Row 4: Right)
        this.anims.create({ key: 'walk-down', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'walk-left', frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'walk-up', frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'walk-right', frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }), frameRate: 8, repeat: -1 });

        this.anims.create({ key: 'atk-down', frames: this.anims.generateFrameNumbers('player_atk', { start: 0, end: 2 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'atk-left', frames: this.anims.generateFrameNumbers('player_atk', { start: 3, end: 5 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'atk-up', frames: this.anims.generateFrameNumbers('player_atk', { start: 6, end: 8 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'atk-right', frames: this.anims.generateFrameNumbers('player_atk', { start: 9, end: 11 }), frameRate: 12, repeat: 0 });

        this.cursors = this.input.keyboard!.createCursorKeys();

        // Fetch map data
        try {
          const res = await fetch('/api/map');
          if (!res.ok) throw new Error('Failed to fetch map');
          this.mapData = await res.json();
        } catch (err) {
          console.error('Failed to load map', err);
          // Fallback map
          this.mapData = { width: 200, height: 200, tiles: Array(200 * 200).fill(0) };
        }

        if (isDestroyed || !this.sys || !this.sys.game) return;

        // Disable context menu for right click panning
        this.input.mouse!.disableContextMenu();

        // Zoom controls
        this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => {
          if (pointer.y >= 480) return;
          let newZoom = this.cameras.main.zoom - deltaY * 0.001;
          newZoom = Phaser.Math.Clamp(newZoom, 0.1, 2);
          this.cameras.main.setZoom(newZoom);
        });

        // Info Text (Top Right)
        this.infoText = this.add.text(630, 10, '', {
          fontSize: '14px',
          color: '#ffffff',
          backgroundColor: '#00000088',
          padding: { x: 8, y: 4 },
          align: 'right'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(2000);

        if (this.isEditor) {
          this.renderMap();
          this.setupEditorUI();
          
          this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Convert screen coordinates to world coordinates for UI check
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            
            // UI area is at the bottom of the screen (fixed to camera)
            if (pointer.y >= 480) return; 
            
            // Middle mouse or right click to pan
            if (pointer.middleButtonDown() || pointer.rightButtonDown()) {
              this.isPanning = true;
              this.panStart.set(pointer.x, pointer.y);
              this.camStart.set(this.cameras.main.scrollX, this.cameras.main.scrollY);
              return;
            }

            // Save state for undo before drawing
            this.undoStack.push([...this.mapData.tiles]);
            this.redoStack = [];
            
            this.handlePointerDown(pointer);
          });

          this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isPanning && (pointer.middleButtonDown() || pointer.rightButtonDown())) {
              const dx = pointer.x - this.panStart.x;
              const dy = pointer.y - this.panStart.y;
              this.cameras.main.scrollX = this.camStart.x - dx / this.cameras.main.zoom;
              this.cameras.main.scrollY = this.camStart.y - dy / this.cameras.main.zoom;
              return;
            }

            if (pointer.isDown && !pointer.middleButtonDown() && !pointer.rightButtonDown()) {
              this.handlePointerDown(pointer);
            }
          });

          this.input.on('pointerup', () => {
            this.isPanning = false;
          });

        } else {
          // Player setup
          this.player = this.physics.add.sprite(100, 100, 'player', 1);
          
          // Scale down if the image is high-res (target height ~64px)
          if (this.textures.exists('player_img')) {
            const img = this.textures.get('player_img').getSourceImage() as HTMLImageElement | HTMLCanvasElement;
            if (img && img.height > 0) {
               const scale = 64 / (img.height / 4);
               this.player.setScale(scale);
               
               // Adjust physics body to be smaller than the sprite (bottom half)
               const bodyWidth = (img.width / 3) * 0.4;
               const bodyHeight = (img.height / 4) * 0.3;
               this.player.body!.setSize(bodyWidth, bodyHeight);
               this.player.body!.setOffset((img.width / 3 - bodyWidth) / 2, (img.height / 4) - bodyHeight - 5);
            }
          }
          
          this.player.setCollideWorldBounds(true);
          this.player.setDepth(10);
          
          this.renderMap();
          
          // Socket events
          socket.on('current_players', (players: any) => {
            if (isDestroyed || !this.sys || !this.sys.game) return;
            Object.keys(players).forEach(id => {
              if (id !== socket.id) {
                this.addOtherPlayer(id, players[id].x, players[id].y, players[id].anim, players[id].frame);
              } else {
                this.player!.setPosition(players[id].x, players[id].y);
              }
            });
          });

          socket.on('player_joined', (player: any) => {
            if (isDestroyed || !this.sys || !this.sys.game) return;
            this.addOtherPlayer(player.id, player.x, player.y, player.anim, player.frame);
          });

          socket.on('player_moved', (player: any) => {
            if (isDestroyed || !this.sys || !this.sys.game) return;
            const other = this.otherPlayers[player.id];
            if (other) {
              other.setPosition(player.x, player.y);
              if (player.anim) {
                other.anims.play(player.anim, true);
              } else {
                other.anims.stop();
                if (player.frame !== undefined) other.setFrame(player.frame);
              }
            }
          });

          socket.on('player_left', (id: string) => {
            if (isDestroyed || !this.sys || !this.sys.game) return;
            if (this.otherPlayers[id]) {
              this.otherPlayers[id].destroy();
              delete this.otherPlayers[id];
            }
          });

          // Virtual Joystick Setup
          const joyX = 80;
          const joyY = 400;
          
          // Base
          this.joystickBase = this.add.circle(joyX, joyY, 60, 0x000000, 0.3).setScrollFactor(0).setDepth(1000).setInteractive();
          
          // D-pad cross graphics
          const graphics = this.add.graphics().setScrollFactor(0).setDepth(1000);
          graphics.lineStyle(6, 0xffffff, 0.2);
          graphics.beginPath();
          graphics.moveTo(joyX - 40, joyY);
          graphics.lineTo(joyX + 40, joyY);
          graphics.moveTo(joyX, joyY - 40);
          graphics.lineTo(joyX, joyY + 40);
          graphics.strokePath();

          // Thumb
          this.joystickThumb = this.add.circle(joyX, joyY, 30, 0xffffff, 0.6).setScrollFactor(0).setDepth(1001);

          this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isEditor) return;
            const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.joystickBase!.x, this.joystickBase!.y);
            if (dist <= 120) { // Allow slightly larger hit area
              this.joystickActive = true;
              this.updateJoystick(pointer);
            }
          });

          this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.joystickActive) {
              this.updateJoystick(pointer);
            }
          });

          const resetJoystick = () => {
            this.joystickActive = false;
            if (this.joystickThumb && this.joystickBase) {
              this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
            }
            this.joystickVector.reset();
          };
          this.input.on('pointerup', resetJoystick);
          this.input.on('pointerout', resetJoystick);

          // Mode Toggle Button
          this.modeButton = this.add.text(500, 20, 'Mode: Walk', {
            color: '#ffffff',
            backgroundColor: '#0000aa',
            padding: { x: 10, y: 5 }
          }).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true });

          this.modeButton.on('pointerdown', () => {
            if (this.actionMode === 'walk') {
              this.actionMode = 'attack';
              this.modeButton!.setText('Mode: Attack');
              this.modeButton!.setBackgroundColor('#aa0000');
              this.attackButton!.setVisible(true);
            } else {
              this.actionMode = 'walk';
              this.modeButton!.setText('Mode: Walk');
              this.modeButton!.setBackgroundColor('#0000aa');
              this.attackButton!.setVisible(false);
            }
          });

          // Attack Button (hidden by default)
          this.attackButton = this.add.text(520, 380, 'ATTACK', {
            color: '#ffffff',
            backgroundColor: '#aa0000',
            padding: { x: 15, y: 15 },
            fontSize: '18px',
            fontStyle: 'bold'
          }).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true }).setVisible(false);

          this.attackButton.on('pointerdown', () => { this.attackButtonDown = true; this.triggerAttack(); });
          this.attackButton.on('pointerup', () => { this.attackButtonDown = false; });
          this.attackButton.on('pointerout', () => { this.attackButtonDown = false; });
          
          this.input.keyboard!.on('keydown-SPACE', () => this.triggerAttack());
        }

        socket.on('map_updated', (newMapData: any) => {
          if (isDestroyed || !this.sys || !this.sys.game) return;
          this.mapData = newMapData;
          this.renderMap();
        });
      }

      triggerAttack() {
        if (this.actionMode !== 'attack' || this.isAttacking || !this.player) return;
        this.isAttacking = true;
        this.player.body!.setVelocity(0);
        const animKey = `atk-${this.currentDirection}`;
        this.player.anims.play(animKey, true);
        
        // Send attack event to other players
        socketRef.current?.emit('player_moved', {
          x: this.player.x,
          y: this.player.y,
          anim: animKey,
          frame: this.player.frame.name
        });

        this.player.once('animationcomplete', () => {
          this.isAttacking = false;
          // Return to idle frame
          if (this.currentDirection === 'left') this.player!.setFrame(4);
          else if (this.currentDirection === 'right') this.player!.setFrame(10);
          else if (this.currentDirection === 'up') this.player!.setFrame(7);
          else this.player!.setFrame(1);
          
          socketRef.current?.emit('player_moved', {
            x: this.player!.x,
            y: this.player!.y,
            anim: null,
            frame: this.player!.frame.name
          });
        });
      }

      updateJoystick(pointer: Phaser.Input.Pointer) {
        if (!this.joystickBase || !this.joystickThumb) return;
        const angle = Phaser.Math.Angle.Between(this.joystickBase.x, this.joystickBase.y, pointer.x, pointer.y);
        let dist = Phaser.Math.Distance.Between(this.joystickBase.x, this.joystickBase.y, pointer.x, pointer.y);
        const maxDist = 60;
        if (dist > maxDist) dist = maxDist;

        this.joystickThumb.x = this.joystickBase.x + Math.cos(angle) * dist;
        this.joystickThumb.y = this.joystickBase.y + Math.sin(angle) * dist;

        // Normalize vector from -1 to 1
        this.joystickVector.x = (this.joystickThumb.x - this.joystickBase.x) / maxDist;
        this.joystickVector.y = (this.joystickThumb.y - this.joystickBase.y) / maxDist;
      }

      addOtherPlayer(id: string, x: number, y: number, anim?: string, frame?: number) {
        const other = this.physics.add.sprite(x, y, 'player', frame !== undefined ? frame : 1);
        
        if (this.textures.exists('player_img')) {
          const img = this.textures.get('player_img').getSourceImage() as HTMLImageElement | HTMLCanvasElement;
          if (img && img.height > 0) {
             other.setScale(64 / (img.height / 4));
          }
        }
        
        other.setTint(0xffdddd); // Slight red tint for other players to distinguish
        other.setDepth(10);
        if (anim) other.anims.play(anim, true);
        this.otherPlayers[id] = other;
      }

      renderMap() {
        if (!this.mapData) return;

        // Convert 1D array to 2D array for Tilemap, adding 1 to indices (0=empty in Phaser tilemaps)
        const data2D: number[][] = [];
        for (let y = 0; y < this.mapData.height; y++) {
          const row: number[] = [];
          for (let x = 0; x < this.mapData.width; x++) {
            row.push(this.mapData.tiles[y * this.mapData.width + x] + 1);
          }
          data2D.push(row);
        }

        if (this.layer) {
          this.layer.destroy();
        }
        if (this.tilemap) {
          this.tilemap.destroy();
        }

        this.tilemap = this.make.tilemap({ data: data2D, tileWidth: 32, tileHeight: 32 });
        this.tileset = this.tilemap.addTilesetImage('tileset')!;
        this.layer = this.tilemap.createLayer(0, this.tileset, 0, 0)!;
        this.layer.setDepth(0);

        // Set collision for Water (index 1+1=2) and Mountain (index 2+1=3)
        this.layer.setCollision([2, 3]);

        if (this.player) {
          this.physics.add.collider(this.player, this.layer);
        }

        // Set world and camera bounds
        this.physics.world.setBounds(0, 0, this.mapData.width * 32, this.mapData.height * 32);
        this.cameras.main.setBounds(0, 0, this.mapData.width * 32, this.mapData.height * 32);

        if (!this.isEditor && this.player) {
          this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
        }
      }

      setupEditorUI() {
        // UI Background
        this.add.rectangle(320, 520, 640, 80, 0x333333).setScrollFactor(0).setDepth(10);
        
        this.tileSelector = this.add.text(20, 510, 'Selected: Water (Press 1:Grass, 2:Water, 3:Mountain)', { color: '#ffffff', fontSize: '14px' }).setScrollFactor(0).setDepth(11);
        
        this.saveButton = this.add.text(500, 505, '[ SAVE MAP ]', { 
          color: '#00ff00', 
          backgroundColor: '#004400',
          padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(11).setInteractive({ useHandCursor: true });

        // Undo Button
        const undoBtn = this.add.text(350, 505, 'UNDO', {
          color: '#ffffff', backgroundColor: '#555555', padding: { x: 8, y: 5 }
        }).setScrollFactor(0).setDepth(11).setInteractive({ useHandCursor: true });
        
        undoBtn.on('pointerdown', () => {
          if (this.undoStack.length > 0) {
            this.redoStack.push([...this.mapData.tiles]);
            this.mapData.tiles = this.undoStack.pop();
            this.renderMap();
          }
        });

        // Redo Button
        const redoBtn = this.add.text(420, 505, 'REDO', {
          color: '#ffffff', backgroundColor: '#555555', padding: { x: 8, y: 5 }
        }).setScrollFactor(0).setDepth(11).setInteractive({ useHandCursor: true });
        
        redoBtn.on('pointerdown', () => {
          if (this.redoStack.length > 0) {
            this.undoStack.push([...this.mapData.tiles]);
            this.mapData.tiles = this.redoStack.pop();
            this.renderMap();
          }
        });

        this.saveButton.on('pointerdown', async () => {
          this.saveButton!.setText('SAVING...');
          try {
            await fetch('/api/map', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(this.mapData)
            });
            this.saveButton!.setText('[ SAVED! ]');
            setTimeout(() => this.saveButton!.setText('[ SAVE MAP ]'), 2000);
            if (onMapSaved) onMapSaved();
          } catch (err) {
            console.error('Save failed', err);
            this.saveButton!.setText('[ ERROR ]');
          }
        });

        this.input.keyboard!.on('keydown-ONE', () => { this.currentTileType = 0; this.updateSelectorText(); });
        this.input.keyboard!.on('keydown-TWO', () => { this.currentTileType = 1; this.updateSelectorText(); });
        this.input.keyboard!.on('keydown-THREE', () => { this.currentTileType = 2; this.updateSelectorText(); });
      }

      updateSelectorText() {
        const names = ['Grass', 'Water', 'Mountain'];
        this.tileSelector?.setText(`Selected: ${names[this.currentTileType]} (Press 1:Grass, 2:Water, 3:Mountain)`);
      }

      handlePointerDown(pointer: Phaser.Input.Pointer) {
        if (!this.mapData || pointer.y >= 480) return; // Don't draw over UI

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const tileSize = 32;
        const x = Math.floor(worldPoint.x / tileSize);
        const y = Math.floor(worldPoint.y / tileSize);

        if (x >= 0 && x < this.mapData.width && y >= 0 && y < this.mapData.height) {
          const index = y * this.mapData.width + x;
          if (this.mapData.tiles[index] !== this.currentTileType) {
            this.mapData.tiles[index] = this.currentTileType;
            // Update tilemap directly for performance instead of full re-render
            if (this.layer) {
              this.layer.putTileAt(this.currentTileType + 1, x, y);
            }
          }
        }
      }

      update(time: number, delta: number) {
        if (this.infoText) {
          if (this.isEditor) {
            const cam = this.cameras.main;
            this.infoText.setText(`Map: World\nCam: (${Math.floor(cam.scrollX / 32)}, ${Math.floor(cam.scrollY / 32)})`);
          } else if (this.player) {
            this.infoText.setText(`Map: World\nPos: (${Math.floor(this.player.x / 32)}, ${Math.floor(this.player.y / 32)})`);
          }
        }

        if (this.isEditor) {
          // Camera panning with keyboard
          const camSpeed = 10 / this.cameras.main.zoom;
          if (this.cursors?.left.isDown) this.cameras.main.scrollX -= camSpeed;
          else if (this.cursors?.right.isDown) this.cameras.main.scrollX += camSpeed;
          
          if (this.cursors?.up.isDown) this.cameras.main.scrollY -= camSpeed;
          else if (this.cursors?.down.isDown) this.cameras.main.scrollY += camSpeed;
          return;
        }

        if (!this.player || !this.cursors) return;

        // Continuous attack check
        if (!this.isAttacking && this.actionMode === 'attack') {
          if (this.cursors.space.isDown || this.attackButtonDown) {
            this.triggerAttack();
          }
        }

        if (this.isAttacking) {
          // Don't allow movement while attacking
          return;
        }

        const speed = 150;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);

        let moved = false;
        let currentAnim = null;

        let moveX = 0;
        let moveY = 0;
        const threshold = 0.3;

        if (this.cursors.left.isDown) moveX = -1;
        else if (this.cursors.right.isDown) moveX = 1;
        else if (Math.abs(this.joystickVector.x) > threshold) moveX = this.joystickVector.x;

        if (this.cursors.up.isDown) moveY = -1;
        else if (this.cursors.down.isDown) moveY = 1;
        else if (Math.abs(this.joystickVector.y) > threshold) moveY = this.joystickVector.y;

        if (moveX !== 0 || moveY !== 0) {
          moved = true;
          const vec = new Phaser.Math.Vector2(moveX, moveY).normalize().scale(speed);
          body.setVelocity(vec.x, vec.y);

          if (Math.abs(moveX) > Math.abs(moveY)) {
            currentAnim = moveX < 0 ? 'walk-left' : 'walk-right';
            this.currentDirection = moveX < 0 ? 'left' : 'right';
          } else {
            currentAnim = moveY < 0 ? 'walk-up' : 'walk-down';
            this.currentDirection = moveY < 0 ? 'up' : 'down';
          }
        }

        let justStopped = false;
        if (moved) {
          this.player.anims.play(currentAnim!, true);
          this.lastAnim = currentAnim;
        } else {
          if (this.player.anims.isPlaying) {
            justStopped = true;
          }
          this.player.anims.stop();
          if (this.currentDirection === 'left') this.player.setFrame(4);
          else if (this.currentDirection === 'right') this.player.setFrame(10);
          else if (this.currentDirection === 'up') this.player.setFrame(7);
          else this.player.setFrame(1); // down idle
        }

        if (moved || justStopped) {
          socket.emit('player_moved', { 
            x: this.player.x, 
            y: this.player.y,
            anim: moved ? currentAnim : null,
            frame: this.player.frame.name
          });
        }
      }
    }

    const gameWidth = 640;
    const gameHeight = mode === 'edit' ? 560 : 480;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      scale: {
        mode: Phaser.Scale.FIT,
        parent: gameRef.current,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: gameWidth,
        height: gameHeight
      },
      audio: {
        noAudio: true
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: MainScene
    };

    phaserGameRef.current = new Phaser.Game(config);
    
    // Pass mode to scene
    phaserGameRef.current.scene.start('MainScene', { mode });

    return () => {
      isDestroyed = true;
      socket.disconnect();
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
      }
    };
  }, [mode]);

  return <div ref={gameRef} className="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden shadow-2xl" />;
}
