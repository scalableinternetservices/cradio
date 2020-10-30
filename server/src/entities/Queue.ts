import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { ListeningSession } from './ListeningSession'
import { Song } from './Song'

@Entity()
export class Queue extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  score: number

  @Column()
  position: number

  @ManyToOne(type => Song, song => song.id)
  song: Song

  // @Column('simple-array', { nullable: true })
  // choices: string[]

  @ManyToOne(type => ListeningSession, listeningSession => listeningSession.queue)
  listeningSession: ListeningSession
}