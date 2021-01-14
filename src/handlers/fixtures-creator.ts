import reflect, { ClassReflection, PropertyReflection } from '@plumier/reflect';
import { ClassLiteral, ClassType } from '../types/class.type';
import { FixtureOptions } from '../types/fixture-options.type';
import { PropertyDto } from '../types/property-dto.interface';
import { FIXTURE_DECORATOR_NAME } from '../decorators';
import FakerStatic = Faker.FakerStatic;
import { ValueHandler } from '../types/value-handler.interface';
import { FunctionValueHandler } from './value-handlers/function-value-handler';
import { ObjectValueHandler } from './value-handlers/object-value-handler';
import { PrimitiveValueHandler } from './value-handlers/primitive-value-handler';

export class FixturesCreator<T> {
  public static readonly DEFAULT_LOCALE = 'en';
  private static readonly REFLECTED_CLASSES: Record<string, ClassReflection> = {};
  protected static VALUE_HANDLERS: ClassType<ValueHandler>[] = [
    PrimitiveValueHandler,
    FunctionValueHandler,
    ObjectValueHandler,
  ];

  public constructor(private readonly _faker: FakerStatic, locale: string) {
    this._faker.setLocale(locale);
  }

  public createForTarget(target: ClassType<unknown>): ClassLiteral<T> | any {
    if (!target) {
      throw new Error(`Target class '${target}' is 'undefined'`);
    }

    const classReflection = FixturesCreator.getClassReflection(target);

    return classReflection.properties?.reduce((acc, val) => {
      const fixtureDecoratorValue = FixturesCreator.extractFixtureDecoratorValue(val);

      const dto = FixturesCreator.createValueDto(val, fixtureDecoratorValue);

      return { ...acc, [val.name]: this.handlePropertyValue(dto, classReflection) };
    }, {}) as ClassLiteral<T>;
  }

  private handlePropertyValue(propertyDto: PropertyDto, parentClassReflection: ClassReflection): any | any[] {
    for (const handlerClass of FixturesCreator.VALUE_HANDLERS) {
      const handler = new handlerClass();
      if (handler.shouldHandle(propertyDto)) {
        if (handler.detectCircularClassFixture(parentClassReflection, propertyDto)) {
          // TODO - what to do when circular between multiple classes?
          throw Error(
            `Circular class-type fixture detected! Target: ${parentClassReflection.name}; Property: ${propertyDto.name}`
          );
        }

        return handler.handle(propertyDto, this);
      }
    }

    return null;
  }

  private static getClassReflection(target: ClassType<unknown>): ClassReflection {
    if (!FixturesCreator.REFLECTED_CLASSES.hasOwnProperty(target.name)) {
      FixturesCreator.REFLECTED_CLASSES[target.name] = reflect(target);
    }

    return FixturesCreator.REFLECTED_CLASSES[target.name];
  }

  private static createValueDto(
    property: PropertyReflection,
    fixtureDecoratorValue: FixtureOptions | null
  ): PropertyDto {
    const { name, type: { name: constructorName } = {} } = property;

    return {
      type: typeof fixtureDecoratorValue,
      value: fixtureDecoratorValue,
      name,
      constructorName,
    };
  }

  private static extractFixtureDecoratorValue(property: PropertyReflection): FixtureOptions | null {
    const { decorators = [] } = property;
    const fixtureDecorator = decorators.find((decorator) => decorator.type === FIXTURE_DECORATOR_NAME);

    return fixtureDecorator ? fixtureDecorator.value : null;
  }

  get faker(): Faker.FakerStatic {
    return this._faker;
  }
}
