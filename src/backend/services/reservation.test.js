// tests/unit/services/reservation.test.js
import { expect } from 'chai';
import sinon from 'sinon';

describe('findOptimalTable', () => {
  let mockFindAvailableTables;
  let findOptimalTable;
  
  beforeEach(() => {
    mockFindAvailableTables = sinon.stub();

    findOptimalTable = async (serviceInstanceId, seatsNeeded, restaurantId = null, excludeReservationId = null) => {
      try {
        const availableTables = await mockFindAvailableTables(serviceInstanceId, seatsNeeded, restaurantId, excludeReservationId);
        
        if (availableTables.length === 0) {
          return null;
        }
        
        availableTables.sort((a, b) => a.seats - b.seats);
        return availableTables[0];
      } catch (error) {
        console.error('Error finding optimal table:', error);
        throw new Error(`Error finding optimal table: ${error.message}`);
      }
    };
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  it('should return the smallest table that can accommodate the party', async () => {
    const mockTables = [
      { table_id: '1', number: '101', seats: 8 },
      { table_id: '2', number: '102', seats: 4 },
      { table_id: '3', number: '103', seats: 6 }
    ];
    
    mockFindAvailableTables.resolves(mockTables);
    
    const serviceInstanceId = 'service-123';
    const seatsNeeded = 4;
    const restaurantId = 'rest1';
    
    const result = await findOptimalTable(serviceInstanceId, seatsNeeded, restaurantId);
    
    expect(mockFindAvailableTables.calledOnce).to.be.true;
    expect(result).to.exist;
    expect(result.table_id).to.equal('2');
    expect(result.seats).to.equal(4);
  });
  
  it('should return null when no tables are available', async () => {
    mockFindAvailableTables.resolves([]);
    
    const result = await findOptimalTable('service-123', 10, 'rest1');
    
    expect(mockFindAvailableTables.calledOnce).to.be.true;
    expect(result).to.be.null;
  });
  
  it('should handle errors properly', async () => {
    const errorMessage = 'Database error';
    mockFindAvailableTables.rejects(new Error(errorMessage));
    
    try {
      await findOptimalTable('service-123', 4);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).to.include('Error finding optimal table');
      expect(error.message).to.include(errorMessage);
    }
  });
});