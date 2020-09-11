import React, {useState} from 'react';
import { View, Text } from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { GlobalContext } from '@components/ContextProvider';
import { BaseScreen } from '../BaseScreen/BaseScreen';
import { JobCard } from './components/Card/JobCard';
import { JobRecord } from '@utils/airtable/interface';
import { getJobs, updateJob } from '@utils/airtable/requests';
import { Status } from '../StatusScreen/StatusScreen';
import ContactsModal from '@components/ContactsModal/ContactsModal';
import { StatusController } from '@screens/StatusScreen/StatusController';

// BWBP
import { Overlay, CheckBox, Button } from 'react-native-elements';
import { cloneDeep } from 'lodash';

interface Availability {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
}

interface JobsScreenState {
  title: string;
  jobs: JobRecord[];
  refreshing: boolean;
  staticHeader: boolean;
  status: Status;
  availability: Availability;
  showOverlay: boolean;
}

interface JobsScreenProps {
  navigation: BottomTabNavigationProp;
}

/**
 * We have a feature request! 
 *
 * Write a function that filters out jobs based on the trainees weekly availability.
 * Bonus: Try wrapping the filtering logic in an overlay component.
 *
 * Sources:
 * - Compontent Library: https://react-native-elements.github.io/react-native-elements/docs/button.html
 *
 */
export class JobsScreen extends React.Component<JobsScreenProps, JobsScreenState> {
  static contextType = GlobalContext;

  constructor(props: JobsScreenProps) {
    super(props);

    this.state = {
      title: 'Jobs',
      jobs: [],
      refreshing: true,
      staticHeader: false,
      status: Status.none,
      showOverlay: false, //control display of overlay
      availability: {
        monday: false,
        tuesday: false,
        wednesday: true,
        thursday: true,
        friday: false,
      },
      
    };
  }

  componentDidMount(): void {
    this.props.navigation.addListener('focus', this.fetchRecords);
  }

  createJobCard = (record: JobRecord, index: number): React.ReactElement => {
    return (
      <JobCard
        key={index}
        user={this.context.user}
        submitted={this.context.user.rid in record.users}
        jobRecord={record}
        updatefn={(): void => {
          updateJob(record.rid, this.context.user);
        }}
      />
    );
  };

  fetchRecords = async (): Promise<void> => {
    this.setState({
      refreshing: true,
    });
    const jobs: JobRecord[] = getJobs();
    this.setState({
      refreshing: false,
      jobs,
      status: this.getStatus(jobs),
    });
  };

  /**
   * TODO: Write filterJobs function that updates the components' state with jobs that align with the users' weekly schedule.
   */
  filterJobs = (jobs: JobRecord[], availability: Availability): void => {
    // Step 0: Clone the jobs input
    const newJobs: JobRecord[] = cloneDeep(jobs);
    const filteredJobs: JobRecord[] = [];
    
    // Step 0.5: List and capitalize days user is unavaialable
    const capitalize = (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1)
    }
    const unavailableDays: string[] = []
    for (const [day, available] of Object.entries(availability)) {
      if (available == false) {
        unavailableDays.push(day);
      }
    }
    const finalUnavailableDays = unavailableDays.map(capitalize);

    // Step 1: Remove jobs where the schedule doesn't align with the users' availability.
    for (const job of Object.entries(newJobs)) {
      const jobDays = job[1].schedule;
      // Locate intersections between unavailable days and job schedules
      const sharedDays = finalUnavailableDays.filter(day => jobDays.includes(day));
      if (sharedDays.length == 0) {
        // Push job object (jobject?) to list of jobs so far
        filteredJobs.push(job[1]);
      }
    }
    // Step 2: Save into state
    this.setState({ jobs: filteredJobs });
  };

  getStatus = (jobs: JobRecord[]): Status => {
    if (!this.context.user.graduated) {
      return Status.jobLocked;
    } else if (jobs.length == 0) {
      return Status.noContent;
    } else {
      return Status.none;
    }
  };

  setHeader = (): void => {
    this.setState({ staticHeader: true });
  };

  /**
   * EXTRA: Toggle display of overlay
   */

  setShowOverlay = (): void => {
    this.setState({showOverlay: !this.state.showOverlay});
  };

  renderCards(): React.ReactElement {
    return <>{this.state.jobs.map((record, index) => this.createJobCard(record, index))}</>;
  }

  render() {
    const { monday, tuesday, wednesday, thursday, friday } = this.state.availability;
    return (
      <BaseScreen
        title={this.state.title}
        refreshMethod={this.fetchRecords}
        refreshing={this.state.refreshing}
        static={this.state.status != Status.none ? 'expanded' : ''}
        headerRightButton={
          <ContactsModal
            resetTesting={(): void => {
              this.props.navigation.navigate('Login');
            }}
          />
        }
      >
        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <Button
            title="Filter by Day"
            containerStyle={{ width: '50%' }}
            onPress={this.setShowOverlay}
          />
        </View>
    
        <Overlay isVisible={this.state.showOverlay}  onBackdropPress={this.setShowOverlay}>
          <View >
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <Text style={{fontSize: 20, fontFamily: "source-sans-pro-bold"}}>Days Available to Work</Text>
            </View>
            <CheckBox
              title="Monday"
              checked={monday}
              onPress={() =>
                this.setState(prev => {
                  return { ...prev, availability: { ...prev.availability, monday: !monday } };
                })
              }
            />
            <CheckBox
              title="Tuesday"
              checked={tuesday}
              onPress={() =>
                this.setState(prev => {
                  return { ...prev, availability: { ...prev.availability, tuesday: !tuesday } };
                })
              }
            />
            <CheckBox
              title="Wednesday"
              checked={wednesday}
              onPress={(): void =>
                this.setState(prev => {
                  return { ...prev, availability: { ...prev.availability, wednesday: !wednesday } };
                })
              }
            />
            <CheckBox
              title="Thursday"
              checked={thursday}
              onPress={(): void =>
                this.setState(prev => {
                  return { ...prev, availability: { ...prev.availability, thursday: !thursday } };
                })
              }
            />
            <CheckBox
              title="Friday"
              checked={friday}
              onPress={(): void =>
                this.setState(prev => {
                  return { ...prev, availability: { ...prev.availability, friday: !friday } };
                })
              }
            />
            
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <Button
            title="Filter Search"
            containerStyle={{ width: '50%' }}
            onPress={(): void => {
              this.filterJobs(getJobs(), this.state.availability);
              this.setShowOverlay();
            }}
          />
          </View>
        </View>
        </Overlay>    
        <StatusController defaultChild={this.renderCards()} status={this.state.status} />
      </BaseScreen>
    );
  }
}
